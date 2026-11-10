// frontend/js/api.js
'use strict';

const API_BASE = '';  // نفس الدومين - السيرفر يخدم الفرونت

function getToken() {
  return localStorage.getItem('token');
}

async function request(method, endpoint, body) {
  try {
    var opts = {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    var token = getToken();
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    if (body) opts.body = JSON.stringify(body);

    var res  = await fetch('/api' + endpoint, opts);
    var data = await res.json();

    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
      location.reload();
      return null;
    }
    return data;
  } catch(e) {
    console.error('API Error:', e);
    return { success: false, message: 'تعذّر الاتصال بالسيرفر' };
  }
}

var api = {
  // Auth
  login:          function(u, p)    { return request('POST', '/auth/login', { username: u, password: p }); },
  getMe:          function()        { return request('GET',  '/auth/me'); },
  changePassword: function(o, n)    { return request('POST', '/auth/change-password', { oldPassword: o, newPassword: n }); },

  // Users
  getUsers:   function()         { return request('GET',    '/users'); },
  createUser: function(data)     { return request('POST',   '/users', data); },
  updateUser: function(id, data) { return request('PUT',    '/users/' + id, data); },
  toggleUser: function(id)       { return request('PATCH',  '/users/' + id + '/toggle'); },
  deleteUser: function(id)       { return request('DELETE', '/users/' + id); },

  // Activities
  getActivities:  function()          { return request('GET',    '/activities'); },
  createActivity: function(data)      { return request('POST',   '/activities', data); },
  bulkImport:     function(acts, rep) { return request('POST',   '/activities/bulk', { activities: acts, replace: rep }); },
  updateActivity: function(id, data)  { return request('PUT',    '/activities/' + id, data); },
  deleteActivity: function(id)        { return request('DELETE', '/activities/' + id); },
  resetAll:       function()          { return request('DELETE', '/activities/reset-all'); },
  resetVotesOnly: function()          { return request('DELETE', '/activities/reset-votes'); },
  toggleVoting:   function()          { return request('POST',   '/activities/toggle-voting'); },
  getSettings:    function()          { return request('GET',    '/activities/settings'); },
  saveSettings:   function(data)      { return request('PUT',    '/activities/settings', data); },

  // Votes
  getVotes:   function()         { return request('GET',  '/votes'); },
  castVote:   function(data)     { return request('POST', '/votes', data); },
  updateVote: function(id, data) { return request('PUT',  '/votes/' + id, data); }
};

window.api = api;
