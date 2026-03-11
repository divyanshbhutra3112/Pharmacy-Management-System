use diesel::prelude::*;
use diesel::sqlite::SqliteConnection;
use dotenvy::dotenv;
use std::env;

pub fn establish_connection() -> SqliteConnection {
    // Load environment variables from .env file
    dotenv().ok();

    // Fetch DATABASE_URL
    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set in .env");

    // Connect to SQLite
    SqliteConnection::establish(&database_url)
        .unwrap_or_else(|_| panic!("Error connecting to {}", database_url))
}