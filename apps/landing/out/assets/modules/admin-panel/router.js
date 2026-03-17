(function(){
    function showSection(id){
        document.querySelectorAll('[id$="Container"]').forEach(el => el.style.display = 'none');
        const target = document.getElementById(id);
        if (target) target.style.display = '';
    }

    function onHashChange(){
        const h = (location.hash||'#apps').replace('#','');
        if (h === 'roles') { showSection('rolesContainer'); }
        else if (h === 'perms') { showSection('permsContainer'); }
        else if (h === 'audit') { showSection('auditContainer'); }
        else if (h === 'features') { showSection('featuresContainer'); }
        else { showSection('appsContainer'); }
    }

    window.addEventListener('hashchange', onHashChange);
    // expose for tests
    window.AdminPanelRouter = { navigate: (name)=> location.hash = name };
    // init
    document.addEventListener('DOMContentLoaded', onHashChange);
})();