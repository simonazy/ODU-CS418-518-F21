var fs = require('fs');
var cp = require('child_process');
var assert = require("assert");
var Path = require('path');
var os = require('os');
var async = require('async');
var mime = require('mime');

var Class = require("pixl-class");
var Tools = require("pixl-tools");

module.exports = Class.create({
	
	api_upload_file: function(args, callback) {
		var self = this;
		
		if (!args.files['file1']) {
			return self.doError('file', "No file upload data found in request.", callback);
		}
		if (!args.query.path) {
			return self.doError('file', "No path found in request.", callback);
		}
		
		this.loadSession(args, function(err, session, user) {
			if (err) return self.doError('session', err.message, callback);
			if (!self.requireValidUser(session, user, callback)) return;
			
			var temp_file = args.files['file1'].path;
			var storage_key = 'files/' + args.query.path;
			
			var url = self.server.config.get('base_app_url') + '/' + storage_key;
			
			self.storage.putStream( storage_key, fs.createReadStream(temp_file), function(err) {
				if (err) return self.doError('file', "Failed to process uploaded file: " + err, callback);
				callback({ code: 0, url: url });
				
				if (self.server.config.get('expiration')) {
					var exp_date = Tools.timeNow() + Tools.getSecondsFromText( self.server.config.get('expiration') );
					self.storage.expire( storage_key, exp_date );
				}
				
			} ); 
		} ); 
	},
	
	api_file: function(args, callback) {
		var self = this;
		var storage_key = '';
		
		if (args.query.path) {
			storage_key = 'files/' + args.query.path;
		}
		else if (args.request.url.replace(/\?.*$/).match(/files?\/(.+)$/)) {
			storage_key = 'files/' + RegExp.$1;
		}
		else {
			return callback( "400 Bad Request", {}, null );
		}
		
		if (this.storage.engine.getFilePath) {
			this.storage.head( storage_key, function(err, info) {
				if (err) {
					if (err.code == "NoSuchKey") return callback( false );
					else return callback( "500 Internal Server Error", {}, '' + err );
				}
				
				args.internalFile = Path.resolve( self.storage.engine.getFilePath( self.storage.normalizeKey(storage_key) ) );
				self.logDebug(6, "Internal redirect for static response: " + storage_key + ": " + args.internalFile );
				return callback(false);
			} ); 
			return;
		}
		
		this.storage.getStream( storage_key, function(err, stream) {
			if (err) {
				if (err.code == "NoSuchKey") return callback( false );
				else return callback( "500 Internal Server Error", {}, '' + err );
			}
			
			callback( 
				"200 OK", 
				{
					"Content-Type": mime.getType( Path.basename(storage_key) ),
					"Cache-Control": "max-age: 31536000"
				}, 
				stream 
			);
		} );
	}
	
} );
