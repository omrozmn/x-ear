const api = require('../../api');
// Notification client helpers - small, focused <500 LOC module
// Responsible for sending notifications to server, fetching stats and showing native notifications
(function(window){
  const NotificationClient = {
    postNotification: async function(notification) {
      try {
        const currentUser = (window.authManager && typeof window.authManager.getCurrentUser === 'function') ? window.authManager.getCurrentUser() : JSON.parse(localStorage.getItem('currentUser') || 'null');
        const payload = {
          userId: notification.userId || (currentUser && currentUser.id) || 'system',
          title: notification.title || 'Bildirim',
          message: notification.message || '',
          type: notification.type || notification.notification_type || 'info',
          extraData: notification.extraData || notification.extra_data || notification.extra || {}
        };

        // Fire-and-forget POST to /api/notifications
        createNotification(data).then(resp => {
          // optional: update local cache from server response
          return resp.json().catch(()=>null);
        }).then(json => {
          // no-op for now
        }).catch(err => {
          console.warn('Failed to POST notification to server:', err);
        });
      } catch (err) {
        console.warn('NotificationClient.postNotification error:', err);
      }
    },

    fetchStats: async function(userId){
      try {
        const uid = userId || ((window.authManager && typeof window.authManager.getCurrentUser === 'function') ? window.authManager.getCurrentUser().id : (JSON.parse(localStorage.getItem('currentUser')||'null')||{}).id) || 'system';
        const resp = await getNotificationsStats(params);
        if (!resp.ok) return null;
        const body = await resp.json();
        return body.data || null;
      } catch (e) {
        console.warn('NotificationClient.fetchStats failed', e);
        return null;
      }
    },

    requestDesktopPermission: async function(){
      if (!('Notification' in window)) return 'unsupported';
      try {
        const permission = await Notification.requestPermission();
        return permission;
      } catch (e) {
        return 'denied';
      }
    },

    showNativeNotification: function(notification){
      try {
        if (!('Notification' in window)) return;
        if (Notification.permission !== 'granted') return;
        const title = notification.title || 'X-Ear CRM';
        const options = {
          body: notification.message || '',
          data: notification.extraData || {},
          icon: '/assets/images/notification-icon.png'
        };
        new Notification(title, options);
      } catch (e) {
        console.warn('showNativeNotification failed', e);
      }
    }
  };

  window.NotificationClient = NotificationClient;
})(window);
