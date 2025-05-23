from flask import Flask, jsonify, request
import pandas as pd
from vnstock import Vnstock

app = Flask(__name__)

# Function to get fresh data directly from vnstock
def get_stock_data():
    try:
        stock = Vnstock().stock(symbol='VCI', source='TCBS')
        return stock.finance.cash_flow(period='year').head()
    except Exception as e:
        print(f"Error fetching data: {e}")
        return None

# API route to get all data
@app.route('/api/cashflow', methods=['GET'])
def get_all_cashflow():
    df = get_stock_data()
    if df is None:
        return jsonify({"error": "Failed to fetch data"}), 500
    
    # Convert DataFrame to list of dictionaries
    data = df.to_dict(orient='records')
    return jsonify(data)

# API route to get specific year's data (by index)
@app.route('/api/cashflow/<int:index>', methods=['GET'])
def get_cashflow_by_index(index):
    df = get_stock_data()
    if df is None:
        return jsonify({"error": "Failed to fetch data"}), 500
    
    if index < 0 or index >= len(df):
        return jsonify({"error": f"Index {index} out of range"}), 404
    
    return jsonify(df.iloc[index].to_dict())

# API route to get specific field data
@app.route('/api/cashflow/field/<field_name>', methods=['GET'])
def get_field_data(field_name):
    df = get_stock_data()
    if df is None:
        return jsonify({"error": "Failed to fetch data"}), 500
    
    valid_fields = ['invest_cost', 'from_invest', 'from_financial', 'from_sale', 'free_cash_flow']
    
    if field_name not in valid_fields:
        return jsonify({"error": f"Invalid field. Valid fields are: {valid_fields}"}), 400
    
    # Return the specified field for all rows
    if field_name in df.columns:
        field_data = df[field_name].to_dict()
        return jsonify(field_data)
    else:
        return jsonify({"error": f"Field '{field_name}' not found in data"}), 404

# Optional: Add a route to get data for a specific symbol
@app.route('/api/cashflow/symbol/<symbol>', methods=['GET'])
def get_cashflow_by_symbol(symbol):
    try:
        stock = Vnstock().stock(symbol=symbol, source='TCBS')
        df = stock.finance.cash_flow(period='year').head()
        data = df.to_dict(orient='records')
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": f"Failed to fetch data for symbol {symbol}: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True)