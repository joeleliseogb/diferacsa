import sqlite3
import re
import os
import sys
import time
from datetime import datetime

SQL_FILE = "/home/joel/Documentos/CodeApp/SG-Tienda/Diferacsa/Ferregonz-05-2026.sql"
DB_FILE = "/home/joel/Documentos/CodeApp/SG-Tienda/Diferacsa/prisma/diferacsa.db"

def parse_sql_values(val_str):
    """
    Parses a string of SQL tuple values into Python data types.
    """
    pos = 0
    length = len(val_str)
    
    while pos < length:
        start_paren = val_str.find('(', pos)
        if start_paren == -1:
            break
            
        row = []
        i = start_paren + 1
        
        while i < length:
            while i < length and val_str[i] in ' \t\r\n':
                i += 1
            if i >= length:
                break
                
            if val_str[i] == ')':
                pos = i + 1
                yield row
                break
            elif val_str[i] == ',':
                i += 1
                continue
                
            if val_str[i] == "'":
                i += 1
                val_chars = []
                while i < length:
                    c = val_str[i]
                    if c == '\\':
                        i += 1
                        if i < length:
                            val_chars.append(val_str[i])
                    elif c == "'":
                        if i + 1 < length and val_str[i+1] == "'":
                            val_chars.append("'")
                            i += 1
                        else:
                            i += 1
                            break
                    else:
                        val_chars.append(c)
                    i += 1
                row.append("".join(val_chars))
            else:
                val_chars = []
                while i < length and val_str[i] not in ',)':
                    val_chars.append(val_str[i])
                    i += 1
                raw = "".join(val_chars).strip()
                if raw.upper() == 'NULL':
                    row.append(None)
                elif raw.upper() == 'TRUE':
                    row.append(1)
                elif raw.upper() == 'FALSE':
                    row.append(0)
                else:
                    try:
                        if '.' in raw or 'e' in raw.lower():
                            row.append(float(raw))
                        else:
                            row.append(int(raw))
                    except ValueError:
                        row.append(raw)

def to_iso_date(val):
    if not val:
        return datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.000Z')
    s = str(val).strip()
    if ' ' in s:
        s = s.replace(' ', 'T')
    if not s.endswith('Z') and '+' not in s:
        s += 'Z'
    return s

def run_import():
    start_time = time.time()
    print("=" * 70)
    print("MIGRACIÓN FÍSICA: FERREGONZ SQL ➔ DIFERACSA (CASA MATRIZ)")
    print("=" * 70)
    
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    cursor.execute("PRAGMA synchronous = OFF;")
    cursor.execute("PRAGMA journal_mode = MEMORY;")
    cursor.execute("PRAGMA cache_size = 100000;")
    
    now_iso = to_iso_date(datetime.utcnow())
    
    # 1. Crear Sucursal Matriz y Bodegas
    print("\n[*] Configurando Sucursal Casa Matriz y Bodegas...")
    cursor.execute("DELETE FROM Branch WHERE id = 'branch-matriz';")
    cursor.execute("""
        INSERT INTO Branch (id, code, name, address, phone, isMain, createdAt, updatedAt)
        VALUES ('branch-matriz', 'MATRIZ', 'Casa Matriz - Ferretería González', 'CALLE REAL TACANA SAN MARCOS', '77703362', 1, ?, ?);
    """, (now_iso, now_iso))
    
    cursor.execute("""
        INSERT OR REPLACE INTO Warehouse (id, branchId, code, name, isDefault, createdAt, updatedAt)
        VALUES 
        ('wh-matriz-1', 'branch-matriz', 'BOD-1', 'Bodega Principal / Sala de Ventas', 1, ?, ?),
        ('wh-matriz-2', 'branch-matriz', 'BOD-2', 'Bodega Secundaria / Material Pesado', 0, ?, ?);
    """, (now_iso, now_iso, now_iso, now_iso))
    conn.commit()
    print("    ✔ Casa Matriz (MATRIZ) y 2 Bodegas creadas con éxito.")
    
    categories = []
    products = []
    prices = []
    stocks = []
    customers = []
    suppliers = []
    
    print("\n[*] Leyendo y transformando archivo SQL...")
    with open(SQL_FILE, 'r', encoding='utf-8', errors='replace') as f:
        for line in f:
            line_str = line.strip()
            if not line_str.startswith("INSERT INTO"):
                continue
                
            val_idx = line_str.find("VALUES")
            if val_idx == -1:
                continue
            val_part = line_str[val_idx+6:].rstrip(";")
            
            # Categories
            if "INSERT INTO `categoriaproducto`" in line_str or "INSERT INTO categoriaproducto" in line_str:
                for row in parse_sql_values(val_part):
                    if len(row) >= 2:
                        cat_id = int(row[0])
                        cat_name = str(row[1]).strip() if row[1] else "General"
                        categories.append((cat_id, cat_name))
                        
            # Products
            elif "INSERT INTO `producto`" in line_str or "INSERT INTO producto" in line_str:
                for row in parse_sql_values(val_part):
                    if len(row) >= 8:
                        p_id = str(row[0]).strip()
                        p_name = str(row[3]).strip() if row[3] else "Sin Nombre"
                        p_desc = str(row[4]).strip() if row[4] else ""
                        p_cat = int(row[6]) if row[6] is not None else None
                        p_sku = str(row[7]).strip() if row[7] else p_id
                        p_date = to_iso_date(row[8]) if len(row) > 8 and row[8] else now_iso
                        products.append((p_id, p_sku, p_sku, p_name, p_desc, p_cat, 0.12, 0, p_date, now_iso))
                        
            # Prices & Stock (productolugar)
            elif "INSERT INTO `productolugar`" in line_str or "INSERT INTO productolugar" in line_str:
                for row in parse_sql_values(val_part):
                    if len(row) >= 8:
                        lugar_id = int(row[0])
                        # Solo importamos stock y precios de Casa Matriz (Lugar 1)
                        if lugar_id == 1:
                            prod_id = str(row[1]).strip()
                            existencias = float(row[2]) if row[2] is not None else 0.0
                            p_normal = float(row[3]) if row[3] is not None else 0.0
                            p_mayorista = float(row[5]) if row[5] is not None else p_normal
                            p_especial = float(row[7]) if row[7] is not None else p_normal
                            
                            # Stock asignado a Bodega Principal de Casa Matriz
                            stock_id = f"stock-matriz-{prod_id}"
                            stocks.append((stock_id, prod_id, "wh-matriz-1", existencias, 5.0, now_iso))
                            
                            # 3 Niveles de Precios
                            prices.append((f"price-{prod_id}-normal", prod_id, "Normal", p_normal, now_iso))
                            prices.append((f"price-{prod_id}-mayorista", prod_id, "Mayorista", p_mayorista, now_iso))
                            prices.append((f"price-{prod_id}-especial", prod_id, "Especial", p_especial, now_iso))
                            
            # Customers
            elif "INSERT INTO `cliente`" in line_str or "INSERT INTO cliente" in line_str:
                for row in parse_sql_values(val_part):
                    if len(row) >= 11:
                        c_id = str(row[0])
                        c_code = str(row[1]) if row[1] else f"CLI{c_id}"
                        c_name = str(row[2]).strip() if row[2] else "Cliente General"
                        c_date = to_iso_date(row[3]) if row[3] else now_iso
                        c_nit = str(row[4]).strip() if row[4] else "CF"
                        c_addr = str(row[5]).strip() if row[5] else ""
                        c_phone = str(row[6]).strip() if row[6] else ""
                        c_email = str(row[7]).strip() if row[7] else ""
                        c_hascredit = 1 if row[8] == 1 else 0
                        c_creditlimit = float(row[9]) if row[9] is not None else 0.0
                        c_balance = float(row[10]) if row[10] is not None else 0.0
                        c_discount = float(row[12]) if len(row) > 12 and row[12] is not None else 0.0
                        c_tier = "Mayorista" if c_hascredit == 1 else "Normal"
                        customers.append((c_id, c_code, c_name, c_name, c_nit, c_email, c_phone, c_addr, c_creditlimit, c_balance, c_hascredit, c_discount, c_tier, c_date, now_iso))
                        
            # Suppliers
            elif "INSERT INTO `proveedor`" in line_str or "INSERT INTO proveedor" in line_str:
                for row in parse_sql_values(val_part):
                    if len(row) >= 10:
                        s_id = str(row[0])
                        s_name = str(row[1]).strip() if row[1] else "Proveedor"
                        s_contact = str(row[2]).strip() if row[2] else ""
                        s_addr = str(row[3]).strip() if row[3] else ""
                        s_phone = str(row[4]).strip() if row[4] else ""
                        s_email = str(row[5]).strip() if row[5] else ""
                        s_nit = str(row[6]).strip() if row[6] else ""
                        s_hascredit = 1 if row[7] == 1 else 0
                        s_balance = float(row[9]) if row[9] is not None else 0.0
                        suppliers.append((s_id, s_name, s_contact, s_nit, s_phone, s_email, s_addr, s_balance, s_hascredit, now_iso, now_iso))

    print(f"    ✔ Categorías extraídas: {len(categories)}")
    print(f"    ✔ Artículos extraídos: {len(products):,}")
    print(f"    ✔ Registros de Stock (Casa Matriz): {len(stocks):,}")
    print(f"    ✔ Tarifas de Precios: {len(prices):,}")
    print(f"    ✔ Clientes extraídos: {len(customers):,}")
    print(f"    ✔ Proveedores extraídos: {len(suppliers):,}")
    
    # 2. Inserción Masiva por Lotes en SQLite
    print("\n[*] Insertando físicamente en diferacsa.db...")
    cursor.execute("DELETE FROM ProductStock;")
    cursor.execute("DELETE FROM ProductPrice;")
    cursor.execute("DELETE FROM Product;")
    cursor.execute("DELETE FROM Category;")
    cursor.execute("DELETE FROM Customer;")
    cursor.execute("DELETE FROM Supplier;")
    
    cursor.executemany("INSERT OR REPLACE INTO Category (id, name) VALUES (?, ?);", categories)
    cursor.executemany("INSERT OR REPLACE INTO Product (id, sku, barcode, name, description, categoryId, taxRate, isService, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);", products)
    cursor.executemany("INSERT OR REPLACE INTO ProductStock (id, productId, warehouseId, quantity, minStock, updatedAt) VALUES (?, ?, ?, ?, ?, ?);", stocks)
    cursor.executemany("INSERT OR REPLACE INTO ProductPrice (id, productId, tierName, price, updatedAt) VALUES (?, ?, ?, ?, ?);", prices)
    cursor.executemany("INSERT OR REPLACE INTO Customer (id, code, name, fiscalName, nit, email, phone, address, creditLimit, currentBalance, hasCredit, maxDiscount, priceTier, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);", customers)
    cursor.executemany("INSERT OR REPLACE INTO Supplier (id, name, contactPerson, nit, phone, email, address, currentBalance, hasCredit, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);", suppliers)
    
    conn.commit()
    
    # 3. Auditoría de Verificación
    print("\n" + "=" * 70)
    print("RESULTADOS DE AUDITORÍA Y VERIFICACIÓN EN LA BASE FÍSICA")
    print("=" * 70)
    
    for tbl in ["Branch", "Warehouse", "Category", "Product", "ProductStock", "ProductPrice", "Customer", "Supplier"]:
        cursor.execute(f"SELECT COUNT(*) FROM {tbl};")
        cnt = cursor.fetchone()[0]
        print(f"  * {tbl.ljust(15)}: {cnt:>8,} registros físicos")
        
    cursor.execute("SELECT SUM(quantity) FROM ProductStock WHERE warehouseId = 'wh-matriz-1';")
    total_stock = cursor.fetchone()[0] or 0.0
    print(f"\n  📦 Stock total físico en Casa Matriz: {total_stock:,.2f} unidades")
    
    cursor.execute("SELECT SUM(currentBalance) FROM Customer;")
    total_balance = cursor.fetchone()[0] or 0.0
    print(f"  💰 Cartera por cobrar total (Clientes): Q {total_balance:,.2f}")
    
    conn.close()
    elapsed = time.time() - start_time
    print(f"\n[✔] Migración completada exitosamente en {elapsed:.2f} segundos.")
    print(f"[✔] Base de datos física: {DB_FILE} ({os.path.getsize(DB_FILE) / (1024*1024):.2f} MB)")

if __name__ == "__main__":
    run_import()
