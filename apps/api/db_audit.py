import sqlite3, os, sys

db_files = [
    "/Users/ozmen/Desktop/x-ear web app/xear_crm.db",
    "/Users/ozmen/Desktop/x-ear web app/x-ear/xear_crm.db",
    "/Users/ozmen/Desktop/x-ear web app/x-ear/apps/api/xear_crm.db",
    "/Users/ozmen/Desktop/x-ear web app/x-ear/apps/api/instance/xear_crm.db",
    "/Users/ozmen/Desktop/x-ear web app/x-ear/apps/api/x_ear.db",
    "/Users/ozmen/Desktop/x-ear web app/x-ear/apps/api/instance/x_ear.db",
    "/Users/ozmen/Desktop/x-ear web app/x-ear/apps/api/xear.db",
    "/Users/ozmen/Desktop/x-ear web app/x-ear/apps/api/database.db",
    "/Users/ozmen/Desktop/x-ear web app/x-ear/apps/api/app.db",
    "/Users/ozmen/Desktop/x-ear web app/x-ear/apps/api/x-ear.db",
    "/Users/ozmen/Desktop/x-ear web app/x-ear/test.db",
    "/Users/ozmen/Desktop/x-ear web app/x-ear/apps/api/test_full.db",
    "/Users/ozmen/Desktop/x-ear web app/x-ear/apps/api/instance/xear_crm_migration_test.db",
]

results = []
for f in db_files:
    if not os.path.exists(f):
        continue
    sz = os.path.getsize(f)
    short = f.replace("/Users/ozmen/Desktop/x-ear web app/", "")
    try:
        db = sqlite3.connect(f)
        db.row_factory = sqlite3.Row
        tabs = [r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
        
        uc = 0
        tc = 0
        users_info = []
        tenants_info = []
        
        if "users" in tabs:
            uc = db.execute("SELECT count(*) FROM users").fetchone()[0]
            if uc > 0:
                for r in db.execute("SELECT email, role, tenant_id FROM users").fetchall():
                    users_info.append(f"    {r['email']}  role={r['role']}  tenant={r['tenant_id']}")
        
        if "tenants" in tabs:
            tc = db.execute("SELECT count(*) FROM tenants").fetchone()[0]
            if tc > 0:
                cols = [c[1] for c in db.execute("PRAGMA table_info(tenants)").fetchall()]
                slug_col = "slug" if "slug" in cols else None
                name_col = "name" if "name" in cols else None
                q = "SELECT * FROM tenants"
                for r in db.execute(q).fetchall():
                    rd = dict(r)
                    tenants_info.append(f"    id={rd.get('id','')} slug={rd.get('slug','')} name={rd.get('name','')}")
        
        # Search for deneme or duzcehelix
        has_deneme = any("deneme" in (u or "").lower() for u in [str(ui) for ui in users_info + tenants_info])
        has_duzce = any("duzce" in (u or "").lower() for u in [str(ui) for ui in users_info + tenants_info])
        has_ozmen = any("ozmen" in (u or "").lower() for u in [str(ui) for ui in users_info + tenants_info])
        
        flag = ""
        if has_deneme or has_duzce or has_ozmen:
            flag = " <<<< MATCH!"
        
        results.append(f"\n{'='*60}")
        results.append(f"{short}  (size={sz:,}b  tables={len(tabs)}  users={uc}  tenants={tc}){flag}")
        for u in users_info:
            results.append(u)
        for t in tenants_info:
            results.append(t)
        
        db.close()
    except Exception as e:
        results.append(f"\n{short}  ERROR: {e}")

out = "\n".join(results)
target = os.path.join(os.path.dirname(os.path.abspath(__file__)), "db_audit_out.txt")
with open(target, "w") as fp:
    fp.write(out)
print(out)
