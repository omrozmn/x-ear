import yaml

openapi_path = '/Users/omerozmen/Desktop/x-ear web app/x-ear/apps/openapi.yaml'

with open(openapi_path, 'r') as f:
    spec = yaml.safe_load(f)

seen_ids = set()

for path, methods in spec.get('paths', {}).items():
    for method, op in methods.items():
        if method in ['get', 'post', 'put', 'patch', 'delete']:
            op_id = op.get('operationId')
            if op_id:
                if op_id in seen_ids:
                    # Duplicate found!
                    new_op_id = f"{op_id}_{method}"
                    op['operationId'] = new_op_id
                    print(f"Renamed duplicate operationId {op_id} to {new_op_id}")
                    seen_ids.add(new_op_id)
                else:
                    seen_ids.add(op_id)

with open(openapi_path, 'w') as f:
    yaml.dump(spec, f, sort_keys=False)

print("OpenAPI spec fixed.")
