# Aurea Solaris Web API

The Web V1 API package targets Python 3.12. Install and validate it from the repository root so local commands match CI.

```bash
python -m pip install -e "./services/api[dev]"
python -m pytest services/api/tests/test_config.py -q
python -m ruff check services/api
python -m mypy --config-file services/api/pyproject.toml services/api/src
```

The explicit mypy config path is required because mypy does not discover a nested `pyproject.toml` from the repository root. Keep database credentials and other secrets in ignored or deployment-managed environment storage only.
