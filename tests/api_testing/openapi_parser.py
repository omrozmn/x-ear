"""OpenAPI specification parser and endpoint extractor."""
import yaml
import json
from typing import Dict, List, Any, Optional
from pathlib import Path
from dataclasses import dataclass
from enum import Enum

from .logging_config import logger


class HTTPMethod(Enum):
    """HTTP methods."""
    GET = "GET"
    POST = "POST"
    PUT = "PUT"
    PATCH = "PATCH"
    DELETE = "DELETE"


@dataclass
class Parameter:
    """API parameter definition."""
    name: str
    location: str  # path, query, header
    required: bool
    schema: Dict[str, Any]


@dataclass
class RequestBody:
    """API request body definition."""
    required: bool
    content_type: str
    schema_ref: Optional[str]  # e.g., "#/components/schemas/PartyCreate"


@dataclass
class Endpoint:
    """API endpoint definition."""
    path: str
    method: str
    summary: str
    operation_id: Optional[str]
    parameters: List[Parameter]
    request_body: Optional[RequestBody]
    tags: List[str]


class OpenAPIParser:
    """Parser for OpenAPI specification files."""
    
    def __init__(self, openapi_file: str):
        """Initialize parser with OpenAPI file path."""
        self.openapi_file = Path(openapi_file)
        self.schema: Optional[Dict] = None
        self.endpoints: List[Endpoint] = []
    
    def load_openapi_schema(self) -> Dict:
        """Load and parse OpenAPI YAML file.
        
        Returns:
            Parsed OpenAPI schema as dictionary
            
        Raises:
            FileNotFoundError: If OpenAPI file doesn't exist
            yaml.YAMLError: If YAML parsing fails
            ValueError: If schema is invalid
        """
        if not self.openapi_file.exists():
            raise FileNotFoundError(f"OpenAPI file not found: {self.openapi_file}")
        
        logger.info(f"Loading OpenAPI schema from {self.openapi_file}")
        
        try:
            with open(self.openapi_file, 'r', encoding='utf-8') as f:
                self.schema = yaml.safe_load(f)
        except yaml.YAMLError as e:
            logger.error(f"Failed to parse YAML: {e}")
            raise
        
        # Validate schema structure
        self._validate_schema()
        
        logger.info(f"Successfully loaded OpenAPI schema (version: {self.schema.get('openapi', 'unknown')})")
        return self.schema
    
    def _validate_schema(self) -> None:
        """Validate OpenAPI schema structure.
        
        Raises:
            ValueError: If schema is missing required sections
        """
        if not self.schema:
            raise ValueError("Schema not loaded")
        
        if 'paths' not in self.schema:
            raise ValueError("OpenAPI schema missing 'paths' section")
        
        if 'components' not in self.schema or 'schemas' not in self.schema.get('components', {}):
            logger.warning("OpenAPI schema missing 'components.schemas' section")
    
    def extract_endpoints(self) -> List[Endpoint]:
        """Extract all endpoint definitions from OpenAPI schema.
        
        Returns:
            List of Endpoint objects
            
        Raises:
            ValueError: If schema not loaded
        """
        if not self.schema:
            raise ValueError("Schema not loaded. Call load_openapi_schema() first")
        
        logger.info("Extracting endpoints from OpenAPI schema")
        self.endpoints = []
        
        paths = self.schema.get('paths', {})
        for path, path_item in paths.items():
            for method in ['get', 'post', 'put', 'patch', 'delete']:
                if method in path_item:
                    operation = path_item[method]
                    endpoint = self._parse_operation(path, method.upper(), operation)
                    self.endpoints.append(endpoint)
        
        logger.info(f"Extracted {len(self.endpoints)} endpoints")
        return self.endpoints
    
    def _parse_operation(self, path: str, method: str, operation: Dict) -> Endpoint:
        """Parse a single operation into an Endpoint object."""
        # Extract parameters
        parameters = []
        for param in operation.get('parameters', []):
            parameters.append(Parameter(
                name=param['name'],
                location=param['in'],
                required=param.get('required', False),
                schema=param.get('schema', {})
            ))
        
        # Extract request body
        request_body = None
        if 'requestBody' in operation:
            req_body = operation['requestBody']
            content = req_body.get('content', {})
            content_type = list(content.keys())[0] if content else 'application/json'
            schema_ref = None
            
            if content_type in content:
                schema = content[content_type].get('schema', {})
                if '$ref' in schema:
                    schema_ref = schema['$ref']
            
            request_body = RequestBody(
                required=req_body.get('required', False),
                content_type=content_type,
                schema_ref=schema_ref
            )
        
        return Endpoint(
            path=path,
            method=method,
            summary=operation.get('summary', ''),
            operation_id=operation.get('operationId'),
            parameters=parameters,
            request_body=request_body,
            tags=operation.get('tags', [])
        )
    
    def resolve_schema_ref(self, ref: str) -> Optional[Dict]:
        """Resolve a $ref reference to its schema definition.
        
        Args:
            ref: Reference string like "#/components/schemas/PartyCreate"
            
        Returns:
            Resolved schema dictionary or None if not found
        """
        if not self.schema:
            raise ValueError("Schema not loaded")
        
        if not ref.startswith('#/'):
            logger.warning(f"External references not supported: {ref}")
            return None
        
        # Parse reference path
        parts = ref[2:].split('/')  # Remove '#/' and split
        
        current = self.schema
        for part in parts:
            if part in current:
                current = current[part]
            else:
                logger.warning(f"Schema reference not found: {ref}")
                return None
        
        return current
    
    def save_endpoints_json(self, output_file: str = "extracted_endpoints.json") -> None:
        """Save extracted endpoints to JSON file for compatibility.
        
        Args:
            output_file: Output JSON file path
        """
        if not self.endpoints:
            logger.warning("No endpoints to save")
            return
        
        # Convert endpoints to dict format
        endpoints_data = []
        for ep in self.endpoints:
            endpoints_data.append({
                'path': ep.path,
                'method': ep.method,
                'summary': ep.summary,
                'operationId': ep.operation_id,
                'tags': ep.tags
            })
        
        output_path = Path(output_file)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(endpoints_data, f, indent=2)
        
        logger.info(f"Saved {len(endpoints_data)} endpoints to {output_path}")


def load_openapi_schema(openapi_file: str = "openapi.yaml") -> Dict:
    """Convenience function to load OpenAPI schema.
    
    Args:
        openapi_file: Path to OpenAPI YAML file
        
    Returns:
        Parsed OpenAPI schema
    """
    parser = OpenAPIParser(openapi_file)
    return parser.load_openapi_schema()


def load_endpoints(openapi_file: str = "openapi.yaml") -> List[Endpoint]:
    """Convenience function to load and extract endpoints.
    
    Args:
        openapi_file: Path to OpenAPI YAML file
        
    Returns:
        List of extracted endpoints
    """
    parser = OpenAPIParser(openapi_file)
    parser.load_openapi_schema()
    return parser.extract_endpoints()
