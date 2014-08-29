# firebase-http-server: a command-line http server configured by firebase.json

`firebase-http-server` is a simple command-line http server that understands the firebase.json configuration file.  Perfect for development so you don't have to deploy to Firebase hosting every time.

Based on [http-server](https://github.com/nodeapps/http-server).

# Installing globally:

Installation via `npm`.  If you don't have `npm` yet:

     curl https://npmjs.org/install.sh | sh

Once you have `npm`:

     npm install firebase-http-server -g

This will install `firebase-http-server` globally so that it may be run from the command line.

## Usage:

     firebase-http-server [config_path] [options]

`[config_path]` defaults to `./firebase.json`.

Now you can visit http://localhost:8080 to view your server.

## Available Options:

`-p` Port to listen for connections on (defaults to 8080)

`-a` Address to bind to (defaults to '0.0.0.0')

`-r` or `--root` Overrides the `firebase.json` root public directory to serve.

`-s` or `--silent` In silent mode, log messages aren't logged to the console.

`-h` or `--help` Displays a list of commands and exits.
