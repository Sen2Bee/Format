### create venv
python -m venv venv
activate venv
pip install flask mysql-connector-python redis


### for intellisense from typescript create jsconfig.json in project root
{
    "compilerOptions": {
      "target": "ES6",
      "module": "ES6",
      "checkJs": true,
      "moduleResolution": "node"
    },
    "include": ["./static/js/**/*.js"]
  }
  
