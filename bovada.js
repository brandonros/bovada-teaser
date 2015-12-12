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

function get_action(doc) {
	return get_array(doc, '.gameline-layout').map(function (layout) {
		var time = layout.querySelector('time').innerText;

		var teams = layout.querySelectorAll('h3');
		var away = teams[0].innerText;
		var home = teams[1].innerText;

		var grid = get_array(layout, '.gameline-grid ul');
		var spreads = get_array(grid[2], 'li');

		var away_line = spreads[0].innerText.split(' ');
		var home_line = spreads[1].innerText.split(' ');

		var away_spread = (away_line[0] || '').replace('½', '.5');

		if (away_spread === 'Pick') {
			away_spread = 0;
		}

		var away_odds = (away_line[1] || '').replace(/["'()]/g, '');

		if (away_odds === 'EVEN') {
			away_odds = '+100';
		}

		var home_spread = (home_line[0] || '').replace('½', '.5');

		if (home_spread === 'Pick') {
			home_spread = 0;
		}

		var home_odds = (home_line[1] || '').replace(/["'()]/g, '');

		if (home_odds === 'EVEN') {
			home_odds = '+100';
		}

		return {
			away: away,
			home: home,
			time: time,
			away_odds: parseInt(away_odds),
			home_odds: parseInt(home_odds),
			away_spread: parseFloat(away_spread),
			home_spread: parseFloat(home_spread)
		};
	});
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

		var lines = game['displayGroups'][0]['itemList'].filter(function (line) {
			return line['description'] === 'Point Spread';
		});

		if (lines.length === 0) { /* games with no spread lines yet */
			return;
		}

		var lines = lines[0]['outcomes'];

		var home_line = lines.find(function (line) {
			return line['competitorId'] === home_team['id'];
		});

		var away_line = lines.find(function (line) {
			return line['competitorId'] === away_team['id'];
		});

		if (away_line['price']['american'] === 'EVEN') {
			away_line['price']['american'] = 100;
		}

		if (home_line['price']['american'] === 'EVEN') {
			home_line['price']['american'] = 100;
		}

		data.push({
			away: away_team['description'],
			home: home_team['description'],
			time: time,
			away_odds: parseInt(away_line['price']['american']),
			home_odds: parseInt(home_line['price']['american']),
			away_spread: parseFloat(away_line['price']['handicap']),
			home_spread: parseFloat(away_line['price']['handicap'])
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
		var home_spread = line['home_spread'] + (line['home_spread'] >= 0 ? -1 * amount : amount);
		var away_spread = line['away_spread'] + (line['away_spread'] >= 0 ? -1 * amount : amount);

		return Object.assign({}, line, { home_spread_teased: home_spread, away_spread_teased: away_spread});
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