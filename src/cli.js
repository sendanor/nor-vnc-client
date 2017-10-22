#!/usr/bin/env node
try {
	var Q = require('q');
	var debug = require('nor-debug');
	var is = require('nor-is');
	var RFB = require('rfb2');
	
	var argv = require('minimist')(process.argv.slice(2));
	var host = argv.host || 'localhost';
	var port = argv.port || 5900;
	var password = argv.password;

	var keyDown = 1;
	var keyUp = 0;

	argv.keys = argv.keys ? argv.keys.split(/[,;]/) || [] : [];

	debug.assert(host).is('string');
	debug.assert(port).is('number');
	debug.assert(password).is('string');
	debug.assert(argv.keys).is('array');
	debug.assert(argv._).ignore(undefined).is('array');

	/** Delay a moment */
	function delay(ms, ret) {
		debug.assert(ms).is('number');
		var defer = Q.defer();
		setTimeout(function () {
			defer.resolve(ret);
		}, ms);
		return defer.promise;
	}

	/** Convert string keys to codes */
	function get_keycode(key) {
		switch(key) {
		case 'backspace'     : return 0xff08;
		case 'bs'            : return 0xff08;
		case 'tab'           : return 0xff09;
		case 'return'        : return 0xff0d;
		case 'enter'         : return 0xff0d;
		case 'escape'        : return 0xff1b;
		case 'insert'        : return 0xff63;
		case 'delete'        : return 0xffff;
		case 'del'           : return 0xffff;
		case 'home'          : return 0xff50;
		case 'end'           : return 0xff57;
		case 'page up'       : return 0xff55;
		case 'page down'     : return 0xff56;
		case 'page_up'       : return 0xff55;
		case 'page_down'     : return 0xff56;
		case 'left'          : return 0xff51;
		case 'up'            : return 0xff52;
		case 'right'         : return 0xff53;
		case 'down'          : return 0xff54;
		case 'f1'            : return 0xffbe;
		case 'f2'            : return 0xffbf;
		case 'f3'            : return 0xffc0;
		case 'f4'            : return 0xffc1;
		case 'f5'            : return 0xffc2;
		case 'f6'            : return 0xffc3;
		case 'f7'            : return 0xffc4;
		case 'f8'            : return 0xffc5;
		case 'f9'            : return 0xffc6;
		case 'f10'           : return 0xffc7;
		case 'f11'           : return 0xffc8;
		case 'f12'           : return 0xffc9;
		case 'shift left'    : return 0xffe1;
		case 'shift right'   : return 0xffe2;
		case 'shift_left'    : return 0xffe1;
		case 'shift_right'   : return 0xffe2;
		case 'control left'  : return 0xffe3;
		case 'control right' : return 0xffe4;
		case 'control_left'  : return 0xffe3;
		case 'control_right' : return 0xffe4;
		case 'meta left'     : return 0xffe7;
		case 'meta right'    : return 0xffe8;
		case 'meta_left'     : return 0xffe7;
		case 'meta_right'    : return 0xffe8;
		case 'alt'           : return 0xffe9;
		case 'alt left'      : return 0xffe9;
		case 'alt right'     : return 0xffea;
		case 'alt_left'      : return 0xffe9;
		case 'alt_right'     : return 0xffea;
		case 'alt_gr'        : return 0xffea;
		default              :
			if (is.string(key) && (key.length === 1)) {
				return key.charCodeAt(0);
			}
			throw new TypeError('Unknown key: '+key);
		};
	}

	/** Open RFB session
	 *
	 * @param opts
	 */
	function open_rfb(opts) {
		return Q.Promise( (resolve, reject) => {
			var r = RFB.createConnection(opts);
			r.on('error', function(err) {
				reject(err);
			});
			r.on('connect', function() {
				resolve(r);
			});
		});
	}

	/** */
	function send_key(r, k) {
		r.keyEvent(k, keyDown);
		return delay(25).then(function() {
			r.keyEvent(k, keyUp);
			return delay(25);
		});
	}

	/* Test code */	
	open_rfb({
		'shared': true,
		'host': host,
		'port': port,
		'password': password
	}).then(function(r) {
		return Q.fcall(function() {
			if (argv.keys && argv.keys.length) {
				return argv.keys.map(function ( key ) {
					return get_keycode(key);
				}).map(function ( key ) {
					return function do_send_key () {
						return send_key(r, key);
					};
				}).reduce(Q.when, Q());
			}
		}).then(function() {
			if (argv._ && argv._.length) {
				return argv._.map(function (keys) {

					if (keys.substr(0, 1) === '/') {
						if (keys.substr(0, 2) === '//') {
							return keys.substr(0, 1).split("");
						}
						return keys.substr(1).split(/[,;]/);
					}

					return keys.split("");
				}).reduce(function (a, b) {
					return a.concat(b);
				}, []).map(function(key) {
					return get_keycode(key);
				}).map(function (key) {
					return function do_send_key () {
						return send_key(r, key);
					};
				}).reduce(Q.when, Q());
			}
		}).fin(function() {
			return r.end();
		});
	}).fail(function(err) {
		console.log('ERROR: '+ err);
	}).done();

} catch(err) {
	console.log('ERROR: ' + err);
}
/* EOF */
