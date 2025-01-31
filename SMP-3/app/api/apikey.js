var fs = require('fs');
var assert = require("assert");
var async = require('async');

var Class = require("pixl-class");
var Tools = require("pixl-tools");

module.exports = Class.create({
	
	api_get_api_keys: function(args, callback) {
		var self = this;
		var params = args.params;
		
		this.loadSession(args, function(err, session, user) {
			if (err) return self.doError('session', err.message, callback);
			if (!self.requireAdmin(session, user, callback)) return;
			
			self.storage.listGet( 'global/api_keys', 0, 0, function(err, items, list) {
				if (err) {
					return callback({ code: 0, rows: [], list: { length: 0 } });
				}
				
				callback({ code: 0, rows: items, list: list });
			} ); 
		} ); 
	},
	
	api_get_api_key: function(args, callback) {
		var self = this;
		var params = args.params;
		
		if (!this.requireParams(params, {
			id: /^\w+$/
		}, callback)) return;
		
		this.loadSession(args, function(err, session, user) {
			if (err) return self.doError('session', err.message, callback);
			if (!self.requireAdmin(session, user, callback)) return;
			
			self.storage.listFind( 'global/api_keys', { id: params.id }, function(err, item) {
				if (err || !item) {
					return self.doError('api_key', "Failed to locate API Key: " + params.id, callback);
				}
				
				callback({ code: 0, api_key: item });
			} ); 
		} ); 
	},
	
	api_create_api_key: function(args, callback) {
		var self = this;
		var params = args.params;
		
		if (!this.requireParams(params, {
			title: /\S/,
			key: /\S/
		}, callback)) return;
		
		this.loadSession(args, function(err, session, user) {
			if (err) return self.doError('session', err.message, callback);
			if (!self.requireAdmin(session, user, callback)) return;
			
			args.user = user;
			args.session = session;
			
			params.id = Tools.generateShortID('k');
			params.username = user.username;
			params.created = params.modified = Tools.timeNow(true);
			
			if (!params.active) params.active = 1;
			if (!params.description) params.description = "";
			if (!params.privileges) params.privileges = {};
			
			self.logDebug(6, "Creating new API Key: " + params.title, params);
			
			self.storage.listUnshift( 'global/api_keys', params, function(err) {
				if (err) {
					return self.doError('api_key', "Failed to create api_key: " + err, callback);
				}
				
				self.logDebug(6, "Successfully created api_key: " + params.title, params);
				self.logTransaction('apikey_create', params.title, self.getClientInfo(args, { api_key: params }));
				callback({ code: 0, id: params.id, key: params.key });
			} ); 
		} ); 
	},
	
	api_update_api_key: function(args, callback) {
		var self = this;
		var params = args.params;
		
		if (!this.requireParams(params, {
			id: /^\w+$/
		}, callback)) return;
		
		this.loadSession(args, function(err, session, user) {
			if (err) return self.doError('session', err.message, callback);
			if (!self.requireAdmin(session, user, callback)) return;
			
			args.user = user;
			args.session = session;
			
			params.modified = Tools.timeNow(true);
			
			self.logDebug(6, "Updating API Key: " + params.id, params);
			
			self.storage.listFindUpdate( 'global/api_keys', { id: params.id }, params, function(err, api_key) {
				if (err) {
					return self.doError('api_key', "Failed to update API Key: " + err, callback);
				}
				
				self.logDebug(6, "Successfully updated API Key: " + api_key.title, params);
				self.logTransaction('apikey_update', api_key.title, self.getClientInfo(args, { api_key: api_key }));
				
				callback({ code: 0 });
			} );
		} );
	},
	
	api_delete_api_key: function(args, callback) {
		var self = this;
		var params = args.params;
		
		if (!this.requireParams(params, {
			id: /^\w+$/
		}, callback)) return;
		
		this.loadSession(args, function(err, session, user) {
			if (err) return self.doError('session', err.message, callback);
			if (!self.requireAdmin(session, user, callback)) return;
			
			args.user = user;
			args.session = session;
			
			self.logDebug(6, "Deleting API Key: " + params.id, params);
			
			self.storage.listFindDelete( 'global/api_keys', { id: params.id }, function(err, api_key) {
				if (err) {
					return self.doError('api_key', "Failed to delete API Key: " + err, callback);
				}
				
				self.logDebug(6, "Successfully deleted API Key: " + api_key.title, api_key);
				self.logTransaction('apikey_delete', api_key.title, self.getClientInfo(args, { api_key: api_key }));
				
				callback({ code: 0 });
			} );
		} );
	}
	
} );
