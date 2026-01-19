"""
Minimal setup.py for development installation.
"""
from setuptools import setup, find_packages

setup(
    name="xear-api",
    version="0.1.0",
    packages=find_packages(exclude=["tests*"]),
    python_requires=">=3.10",
)
