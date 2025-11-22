-- AfroGazette Sales & Commission Platform Database Schema
-- PostgreSQL 14+

-- Drop existing tables (if any) in correct order
DROP TABLE IF EXISTS commission_payments CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

-- ==============================================
-- USERS TABLE
-- ==============================================
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  role VARCHAR(20) CHECK (role IN ('admin', 'journalist')) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- ==============================================
-- CLIENTS TABLE
-- ==============================================
CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  client_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  phone_number VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  address TEXT,
  added_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- SALES TABLE
-- ==============================================
CREATE TABLE sales (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  journalist_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) CHECK (payment_method IN 
    ('Cash', 'Ecocash', 'InnBucks', 'Omari', 'Bank Transfer')) NOT NULL,
  payment_date DATE NOT NULL,
  ad_type VARCHAR(50) CHECK (ad_type IN 
    ('WhatsApp Channel', 'WhatsApp Group', 'Print', 'Radio', 'TV', 'Digital Banner')) NOT NULL,
  description TEXT,
  proof_of_payment_url VARCHAR(500),
  status VARCHAR(20) CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  commission_amount DECIMAL(10, 2),
  commission_rate DECIMAL(5, 2) DEFAULT 10.00,
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- INVOICES TABLE
-- ==============================================
CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE UNIQUE,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  client_phone VARCHAR(20),
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  payment_date DATE NOT NULL,
  ad_type VARCHAR(50),
  description TEXT,
  generated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  pdf_path VARCHAR(500)
);

-- ==============================================
-- COMMISSION PAYMENTS TABLE
-- ==============================================
CREATE TABLE commission_payments (
  id SERIAL PRIMARY KEY,
  journalist_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50),
  reference_number VARCHAR(100),
  notes TEXT,
  paid_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- SETTINGS TABLE
-- ==============================================
CREATE TABLE settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- INDEXES FOR PERFORMANCE
-- ==============================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_clients_added_by ON clients(added_by);
CREATE INDEX idx_sales_journalist ON sales(journalist_id);
CREATE INDEX idx_sales_client ON sales(client_id);
CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_sales_date ON sales(payment_date);
CREATE INDEX idx_invoices_sale ON invoices(sale_id);
CREATE INDEX idx_commission_journalist ON commission_payments(journalist_id);

-- ==============================================
-- INSERT DEFAULT SETTINGS
-- ==============================================
INSERT INTO settings (setting_key, setting_value) VALUES
('company_name', 'AfroGazette Media & Advertising'),
('company_address', 'Office 4, Second Floor, Karimapondo Building, 78 Leopold Takawira, Harare, Zimbabwe'),
('default_commission_rate', '10.00'),
('invoice_prefix', 'INV');

-- ==============================================
-- CREATE DEFAULT ADMIN USER
-- Email: admin@afrogazette.com
-- Password: Admin123!
-- ==============================================
INSERT INTO users (first_name, last_name, email, password_hash, role) 
VALUES (
  'Admin',
  'User',
  'admin@afrogazette.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin'
);

-- ==============================================
-- SAMPLE DATA FOR TESTING (Optional - Remove in production)
-- ==============================================

-- Sample Journalist
INSERT INTO users (first_name, last_name, email, password_hash, phone_number, role) 
VALUES (
  'John',
  'Reporter',
  'john@afrogazette.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  '+263771234567',
  'journalist'
);

-- Sample Clients
INSERT INTO clients (client_name, contact_person, phone_number, email, address, added_by) 
VALUES 
('ABC Corporation', 'Jane Smith', '+263712345678', 'jane@abc.co.zw', '123 Main Street, Harare', 2),
('XYZ Industries', 'Bob Johnson', '+263713456789', 'bob@xyz.co.zw', '456 Enterprise Road, Harare', 2),
('Local Shop', 'Mary Williams', '+263714567890', 'mary@localshop.co.zw', '789 Market Street, Harare', 2);

-- Sample Sales
INSERT INTO sales (client_id, journalist_id, amount, payment_method, payment_date, ad_type, description, status, commission_amount, commission_rate, approved_by, approved_at)
VALUES
(1, 2, 500.00, 'Ecocash', '2025-01-15', 'WhatsApp Channel', 'Monthly advertising campaign', 'approved', 50.00, 10.00, 1, CURRENT_TIMESTAMP),
(2, 2, 750.00, 'Bank Transfer', '2025-01-20', 'Radio', 'Radio spot advertisement', 'approved', 75.00, 10.00, 1, CURRENT_TIMESTAMP),
(3, 2, 300.00, 'Cash', '2025-01-25', 'Print', 'Newspaper advertisement', 'pending', 30.00, 10.00, NULL, NULL);

-- Sample Commission Payment
INSERT INTO commission_payments (journalist_id, amount, payment_date, payment_method, reference_number, notes, paid_by)
VALUES
(2, 50.00, '2025-01-16', 'Ecocash', 'ECOCASH-2025-001', 'Commission for ABC Corporation sale', 1);

-- ==============================================
-- DATABASE SETUP COMPLETE
-- ==============================================

-- Verify installation
SELECT 'Database schema created successfully!' as status;
SELECT 'Total tables: ' || COUNT(*) as info FROM information_schema.tables WHERE table_schema = 'public';
SELECT 'Default admin user created: admin@afrogazette.com (Password: Admin123!)' as credentials;
