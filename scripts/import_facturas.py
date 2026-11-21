import sqlite3
import re
import os
import sys
import time
from datetime import datetime

SQL_FILE = "/home/joel/Documentos/CodeApp/SG-Tienda/Diferacsa/Ferregonz-05-2026.sql"
DB_FILE = "/home/joel/Documentos/CodeApp/SG-Tienda/Diferacsa/prisma/diferacsa.db"

def to_iso_date(val):
    if not val:
        return datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.000Z')
    s = str(val).strip()
    if ' ' in s:
        s = s.replace(' ', 'T')
    if not s.endswith('Z') and '+' not in s:
        s += 'Z'
    return s

def parse_sql_values(val_str):
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

def import_invoices_and_details():
    start = time.time()
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("PRAGMA synchronous = OFF;")
    cursor.execute("PRAGMA journal_mode = MEMORY;")
    cursor.execute("PRAGMA cache_size = 200000;")

    # Get set of valid customer IDs
    cursor.execute("SELECT id FROM Customer;")
    valid_customers = set(r[0] for r in cursor.fetchall())
    print(f"[*] Valid customers loaded: {len(valid_customers):,}")

    now_iso = to_iso_date(datetime.utcnow())
    
    invoices = []
    print("[*] Reading facturas from SQL file...")
    with open(SQL_FILE, 'r', encoding='utf-8', errors='replace') as f:
        for line in f:
            line_str = line.strip()
            if line_str.startswith("INSERT INTO `factura`") or line_str.startswith("INSERT INTO factura"):
                val_idx = line_str.find("VALUES")
                if val_idx == -1:
                    continue
                val_part = line_str[val_idx+6:].rstrip(";")
                for row in parse_sql_values(val_part):
                    if len(row) >= 6:
                        fac_id = str(row[0])
                        c_id = str(row[2]) if row[2] is not None and str(row[2]) in valid_customers else None
                        no_fac = str(row[3]) if row[3] is not None else fac_id
                        f_date = to_iso_date(row[4])
                        f_total = float(row[5]) if row[5] is not None else 0.0
                        f_balance = float(row[7]) if len(row) > 7 and row[7] is not None else 0.0
                        f_iscredit = 1 if len(row) > 6 and row[6] == 1 else 0
                        f_iscancelled = 1 if len(row) > 11 and row[11] == 1 else 0
                        f_user = str(row[8]) if len(row) > 8 and row[8] else "Admin"
                        
                        invoices.append((fac_id, "branch-matriz", no_fac, c_id, f_date, f_total, f_balance, f_iscredit, f_iscancelled, f_user, f_date))

    print(f"[+] Facturas parsed: {len(invoices):,}. Inserting into database...")
    cursor.execute("DELETE FROM InvoiceItem;")
    cursor.execute("DELETE FROM Invoice;")
    
    batch_size = 20000
    for i in range(0, len(invoices), batch_size):
        cursor.executemany("""
            INSERT OR REPLACE INTO Invoice (id, branchId, invoiceNumber, customerId, date, total, balance, isCredit, isCancelled, cashierName, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, invoices[i:i+batch_size])
        conn.commit()
        print(f"    - Insertadas {min(i+batch_size, len(invoices)):,}/{len(invoices):,} facturas...")

    # Now read and insert detallefactura
    print("\n[*] Reading detallefactura from SQL file...")
    details = []
    det_count = 0
    with open(SQL_FILE, 'r', encoding='utf-8', errors='replace') as f:
        for line in f:
            line_str = line.strip()
            if line_str.startswith("INSERT INTO `detallefactura`") or line_str.startswith("INSERT INTO detallefactura"):
                val_idx = line_str.find("VALUES")
                if val_idx == -1:
                    continue
                val_part = line_str[val_idx+6:].rstrip(";")
                for row in parse_sql_values(val_part):
                    if len(row) >= 12:
                        det_id = str(row[0])
                        fac_id = str(row[1])
                        qty = float(row[2]) if row[2] is not None else 1.0
                        price = float(row[4]) if row[4] is not None else 0.0
                        prod_id = str(row[10]).strip() if row[10] else "DESCONOCIDO"
                        subtotal = float(row[11]) if row[11] is not None else (qty * price)
                        discount = 0.0
                        details.append((det_id, fac_id, prod_id, qty, price, subtotal, discount))
                        
                        if len(details) >= batch_size:
                            cursor.executemany("""
                                INSERT OR REPLACE INTO InvoiceItem (id, invoiceId, productId, quantity, price, total, discount)
                                VALUES (?, ?, ?, ?, ?, ?, ?);
                            """, details)
                            conn.commit()
                            det_count += len(details)
                            print(f"    - Insertados {det_count:,} detalles...")
                            details = []

    if details:
        cursor.executemany("""
            INSERT OR REPLACE INTO InvoiceItem (id, invoiceId, productId, quantity, price, total, discount)
            VALUES (?, ?, ?, ?, ?, ?, ?);
        """, details)
        conn.commit()
        det_count += len(details)

    print(f"\n[✔] Detalle facturas insertadas: {det_count:,}")
    
    cursor.execute("SELECT count(*) FROM Invoice;")
    total_inv = cursor.fetchone()[0]
    cursor.execute("SELECT count(*) FROM InvoiceItem;")
    total_it = cursor.fetchone()[0]
    cursor.execute("SELECT sum(total) FROM Invoice;")
    total_rev = cursor.fetchone()[0] or 0.0

    print("=" * 70)
    print("RESUMEN DE VENTAS HISTÓRICAS IMPORTADAS:")
    print(f"  * Facturas totales: {total_inv:,}")
    print(f"  * Líneas vendidas : {total_it:,}")
    print(f"  * Ventas totales históricas: Q {total_rev:,.2f}")
    print(f"  * Tiempo transcurrido: {time.time()-start:.2f} segundos")
    print("=" * 70)
    conn.close()

if __name__ == "__main__":
    import_invoices_and_details()
