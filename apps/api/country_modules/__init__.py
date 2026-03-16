"""
Country Module System -- Pluggable per-country business logic.

Usage:
    from country_modules import get_module
    module = get_module('TR')
    module.validate_tax_id('12345678901')
"""
from .base import BaseCountryModule

_registry: dict[str, type[BaseCountryModule]] = {}


def register(code: str, cls: type[BaseCountryModule]):
    """Register a country module."""
    _registry[code] = cls


def get_module(country_code: str) -> BaseCountryModule:
    """Get the country module for a given country code.
    Falls back to StubModule if no specific implementation exists."""
    cls = _registry.get(country_code)
    if cls:
        return cls()
    from ._stub import StubModule
    return StubModule(country_code)


def get_available_modules() -> list[str]:
    """Return list of fully-implemented country codes."""
    return list(_registry.keys())


# Auto-register known modules
def _auto_register():
    from .tr import TurkeyModule
    register('TR', TurkeyModule)


_auto_register()
