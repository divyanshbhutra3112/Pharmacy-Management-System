CREATE TABLE medicines (
    batch_id VARCHAR NOT NULL PRIMARY KEY,
    medicine_name VARCHAR NOT NULL,
    combination VARCHAR NOT NULL,
    date_of_expiry DATE NOT NULL,
    manufacturer VARCHAR NOT NULL,
    price REAL NOT NULL,
    purpose VARCHAR NOT NULL
);