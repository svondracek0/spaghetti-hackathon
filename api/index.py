import sys
import os

# Add the src structure to the python path so the backend folder is discoverable
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from spaghetti_hackathon.main import app
