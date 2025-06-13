# Python Virtual Environment Setup

This project uses Python for advanced BACnet point clustering with kmodes algorithm. To avoid conflicts with your system Python packages, we use a virtual environment.

## Quick Setup

Run the setup script:

```bash
pnpm run setup:python
```

This will:
1. ✅ Check if Python 3 is installed
2. 🔧 Create a virtual environment in `./venv`
3. 🔥 Activate the virtual environment
4. 📦 Install required dependencies from `requirements.txt`

## Manual Setup

If you prefer to set up manually:

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Using the Virtual Environment

### Activate
```bash
source venv/bin/activate
```

### Deactivate
```bash
deactivate
```

### Check if Active
When active, your terminal prompt will show `(venv)` at the beginning.

## Dependencies

The Python environment includes:
- `kmodes>=0.12.0` - Clustering algorithm for categorical data
- `numpy>=1.21.0` - Numerical computing
- `scikit-learn>=1.0.0` - Machine learning utilities

## Integration

The Node.js application automatically detects and uses the virtual environment:
- If `./venv/bin/python` exists, it uses that
- Otherwise falls back to system `python3`

## Troubleshooting

**Virtual environment not activating?**
- Make sure you're in the project root directory
- Try: `python3 -m venv venv --clear` to recreate it

**Dependencies not installing?**
- Activate the virtual environment first
- Update pip: `pip install --upgrade pip`
- Try installing individually: `pip install kmodes numpy scikit-learn`

**Python script fails?**
- Check that virtual environment is created: `ls venv/`
- Verify Python version: `python --version` (should be 3.8+)
- Check dependencies: `pip list` 