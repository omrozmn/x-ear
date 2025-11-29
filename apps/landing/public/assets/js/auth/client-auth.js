(function(global){
    // Simple AuthManager - works in browser and can be required in Jest
    class AuthManager {
        constructor(opts = {}){
            this.fetchImpl = opts.fetchImpl || (typeof fetch !== 'undefined' ? fetch.bind(global) : null);
            this.user = null;
            this.apps = {}; // keyed by appId {appId, appSlug, roles:[], permissions:[]}
            this.globalPermissions = [];
            this.ready = false;
            this._readyPromise = null;
            if (opts.autoLoad !== false){
                this.load();
            }
        }

        async load(){
            if (this._readyPromise) return this._readyPromise;
            this._readyPromise = (async () => {
                if (!this.fetchImpl) return;
                try{
                    const res = await this.fetchImpl('/api/users/me', {credentials: 'same-origin'});
                    if (!res || res.status !== 200) return;
                    const body = await res.json();
                    if (body && body.success && body.data){
                        this._applyUser(body.data);
                    }
                }catch(e){
                    // swallow network errors; UI can show unauthenticated state
                }
                this.ready = true;
            })();
            return this._readyPromise;
        }

        _applyUser(data){
            this.user = data;
            this.apps = {};
            (data.apps || []).forEach(a => {
                this.apps[a.appId] = a;
            });
            this.globalPermissions = data.globalPermissions || [];
        }

        is(roleName){
            if (!this.user) return false;
            if (this.user.role === roleName) return true;
            // check app roles
            for (const k in this.apps){
                if ((this.apps[k].roles || []).includes(roleName)) return true;
            }
            return false;
        }

        can(permissionName, appId){
            if (!this.user) return false;
            if (this.globalPermissions && (this.globalPermissions.includes('*') || this.globalPermissions.includes(permissionName))) return true;
            if (appId){
                const a = this.apps[appId];
                if (!a) return false;
                return (a.permissions || []).includes(permissionName);
            }
            // not app-scoped: check any app where user has permission
            for (const k in this.apps){
                if ((this.apps[k].permissions || []).includes(permissionName)) return true;
            }
            return false;
        }

        logout(){
            // attempt to remove token (if stored in localStorage)
            try{ localStorage.removeItem('jwt'); }catch(e){}
            this.user = null; this.apps = {}; this.globalPermissions = []; this.ready = false;
            if (typeof window !== 'undefined') window.location.href = '/login.html';
        }

        // test helper: allow injection of user object directly
        _setUserForTest(data){
            this._applyUser(data);
        }
    }

    // Attach to global
    try{ global.authManager = global.authManager || new AuthManager(); }catch(e){ /* ignore */ }

    // CommonJS export for Jest tests
    if (typeof module !== 'undefined' && module.exports){
        module.exports = AuthManager;
    }

})(typeof window !== 'undefined' ? window : global);