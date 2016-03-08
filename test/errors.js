var test = require('tape-catch')
var makeTestState = require('./helpers/test-state')

test('recieve error with non-existent template', function(t) {
	var state = makeTestState()
	t.plan(2)

	state.render('nope', {}, function (err, setCurrent) {
		t.ok(err, 'received an error')
		t.notOk(setCurrent, 'setCurrent is falsey')

		t.end()
	})
})

test('recieve error with non-existent current', function(t) {
	var state = makeTestState()
	t.plan(2)

	state.retrieval.addPost('post', { title: 'TEMPLAAAATE', markdown: false }, 'container {{>current}} container')

	state.render('post', {}, function (err, setCurrent) {
		t.notOk(err, 'no error')

		setCurrent('nope', function (err) {
			t.ok(err, 'got an error')
			t.end()
		})
	})
})

test('recieve error with non-existent child', function(t) {
	var state = makeTestState()
	var totalErrs = 0
	t.plan(5)

	state.retrieval.addPost('post', { title: 'TEMPLAAAATE', markdown: false }, 'container {{>current}} container')
	state.retrieval.addPost('file1.md', { title: 'Title', date: new Date() }, 'main ::nope:: main')

	state.render('post', {}, function (err, setCurrent) {
		t.notOk(err, 'no error')
		setCurrent('file1.md', function (err) {
			t.notOk(err)
			if (err) totalErrs++
		})
		setCurrent.on('error', function (err) {
			t.ok(err, 'got an error')
			if (err) totalErrs++
		})
		setTimeout(function () {
			t.equal(setCurrent.ractive.toHTML(), 'container <p>main  main</p> container')
			t.equal(totalErrs, 1, 'one error')
			t.end()

		}, 200)
	})
})
