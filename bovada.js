var action_map = {
	'6': {
		'2': 10 / 11,
		'3': 8 / 5,
		'4': 13 / 5,
		'5': 4 / 1,
		'6': 6 / 1,
		'7': 9 / 1,
		'8': 15 / 1,
		'9': 20 / 1,
		'10': 25 / 1
	},
	'6.5': {
		'2': 5 / 6,
		'3': 7 / 5,
		'4': 9 / 4,
		'5': 15 / 4,
		'6': 5 / 1,
		'7': 8 / 1,
		'8': 11 / 1,
		'9': 15 / 1,
		'10': 20 / 1
	},
	'7': {
		'2': 3 / 4,
		'3': 6 / 5,
		'4': 2 / 1,
		'5': 15 / 4,
		'6': 9 / 2,
		'7': 7 / 1,
		'8': 9 / 1,
		'9': 12 / 1,
		'10': 15 / 1
	}
};

function convert_to_array(nodes) {
	var elements = [];

	for (var i = 0; i < nodes.length; ++i) {
		elements.push(nodes[i]);
	}

	return elements;
}

function get_array(parent, selector) {
	return convert_to_array(parent.querySelectorAll(selector));
}

function translate_games(games) {
	var data = [];

	games.forEach(function (game) {
		var time = game['startTime'] / 1000;

		var home_team = game['competitors'].find(function (team) {
			return team['type'] === 'HOME';
		});

		var away_team = game['competitors'].find(function (team) {
			return team['type'] !== 'HOME';
		});

		var spread_line = game['displayGroups'][0]['itemList'].find(function (line) {
			return line['description'] === 'Point Spread';
		});

		var total_line = game['displayGroups'][0]['itemList'].find(function (line) {
			return line['description'] === 'Total' && line['outcomes'][0]['price']; /* watch out for empty lines with no price */
		});

		if (spread_line) {
			var spread_outcomes = spread_line['outcomes'];

			var home_spread_line = spread_outcomes.find(function (outcome) {
				return outcome['competitorId'] === home_team['id'];
			});

			var away_spread_line = spread_outcomes.find(function (outcome) {
				return outcome['competitorId'] === away_team['id'];
			});

			if (away_spread_line['price']['american'] === 'EVEN') {
				away_spread_line['price']['american'] = 100;
			}

			if (home_spread_line['price']['american'] === 'EVEN') {
				home_spread_line['price']['american'] = 100;
			}
		}

		if (total_line) {
			var over_outcome = total_line['outcomes'].find(function (outcome) {
				return outcome['description'] === 'Over';
			});

			var under_outcome = total_line['outcomes'].find(function (outcome) {
				return outcome['description'] === 'Under';
			});

			if (over_outcome['price']['american'] === 'EVEN') {
				over_outcome['price']['american'] = 100;
			}

			if (under_outcome['price']['american'] === 'EVEN') {
				under_outcome['price']['american'] = 100;
			}
		}

		data.push({
			away: away_team['description'],
			home: home_team['description'],
			time: time,
			away_odds: away_spread_line ? parseInt(away_spread_line['price']['american']) : null,
			home_odds: home_spread_line ? parseInt(home_spread_line['price']['american']) : null,
			away_spread: away_spread_line ? parseFloat(away_spread_line['price']['handicap']) : null,
			home_spread: home_spread_line ? parseFloat(home_spread_line['price']['handicap']) : null,
			over: over_outcome ? parseFloat(over_outcome['price']['handicap']) : null,
			over_odds: over_outcome ? parseFloat(over_outcome['price']['handicap']) : null,
			under: under_outcome ? parseFloat(under_outcome['price']['handicap']) : null,
			under_odds: under_outcome ? parseInt(under_outcome['price']['american']) : null
		});
	});

	return data;
}

function calculate_favors(lines) {
	return lines.map(function (line) {
		var favor;

		if (line['home_odds'] === line['away_odds']) {
			favor = 'none';
		}

		favor = line['home_odds'] > line['away_odds'] ? 'home': 'away';

		return Object.assign({}, line, { favor: favor });
	});
}

function calculate_teased_spreads(lines, amount) {
	return lines.map(function (line) {
		var home_spread_teased = null;
		var away_spread_teased = null;
		var over_teased = null;
		var under_teased = null;

		if (line['home_spread'] !== null && line['away_spread'] !== null) {
			home_spread_teased = line['home_spread'] + (line['home_spread'] >= 0 ? -1 * amount : amount);
			away_spread_teased = line['away_spread'] + (line['away_spread'] >= 0 ? -1 * amount : amount);
		}

		if (line['over'] !== null && line['under'] !== null) {
			over_teased = line['over'] - 7;
			under_teased = line['under'] + 7;
		}

		return Object.assign({}, line, { 
			home_spread_teased: home_spread_teased, 
			away_spread_teased: away_spread_teased,
			over_teased: over_teased,
			under_teased: under_teased
		});
	});
}

function draw_line(line) {
	return `<tr>
		<td><input type="checkbox" class="line-selector"></td>
		<td class="${line.favor === 'away' ? 'bg-warning' : ''}">${line.away}</td>
		<td>${line.away_spread_teased}</td>
		<td>${line.away_odds}</td>
		<td class="${line.favor === 'home' ? 'bg-warning' : ''}">${line.home}</td>
		<td>${line.home_spread_teased}</td>
		<td>${line.home_odds}</td>
		<td>${line.over_teased}</td>
		<td>${line.over_odds}</td>
		<td>${line.under_teased}</td>
		<td>${line.under_odds}</td>
	</tr>`;
}

function draw_lines(lines) {
	return lines.reduce(function (prev, item) {
		return prev + draw_line(item);
	}, '');
}

function load_from_console() {
	var lines = get_action();

	lines = calculate_favors(lines);
	lines = calculate_teased_spreads(lines, 7);

	draw_lines(lines);
}