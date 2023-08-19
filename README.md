# Pupille

[![npm package](https://github.com/Euregan/pupille/actions/workflows/npm.yml/badge.svg)](https://github.com/Euregan/pupille/actions/workflows/npm.yml)

Pupille is a visual testing tool, running directly on your computer and CI
server.

## Setting up

### Install Pupille

Using the package manager of your choice:

```shell
npm install pupille
yarn add pupille
```

### Set up your configuration

Create a `pupille.config.js` file with the following empty skeleton:

```js
// /pupille.config.js
module.exports = {
  baseUrl: '',
  tests: [],
}
```

You can start adding the URLs you want to test like so:

```js
// /pupille.config.js
module.exports = {
  baseUrl: 'http://localhost:3000',
  tests: [{ url: '/login' }, { url: '/profile' }, { url: '/dashboard' }],
}
```

### Testing it out

Simply run `pupille check`:

```shell
npx pupille check
```

This will run the Pupille checker on your machine, and screenshots will be
generated automatically for the configured URLs.

If the results are as expected, you can approve all of the new screenshots with
`npx pupille approve '*'`. If only some of the URLs are fine, you can specify
which you want to approve (for example: `npx pupille approve /login,/profile`).
