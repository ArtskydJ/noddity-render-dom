var makeTestState = require('./helpers/test-state')
var state = makeTestState()
console.dir(state)

state.retrieval.addPost('entry.md', { title: 'Some title', date: new Date() }, 'lol yeah ::herp|wat:: ::herp|huh::')
state.retrieval.addPost('herp', { title: 'Some title', date: new Date(), markdown: false }, 'lookit {{1}}')

/*
// THIS WORKS
state.retrieval.getPost('herp', function(err, post) {
	state.render(post, { 1: 'joseph' })
})
*/

// THIS DOES NOT WORK
state.retrieval.getPost('entry.md', function(err, post) {
	state.render(post, {})
})


// TO RUN THIS FILE DO
// browserify test/silly.js | smokestack
