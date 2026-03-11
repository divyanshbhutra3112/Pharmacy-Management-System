use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use chrono::NaiveDate;
use crate::schema::medicines;

// READING from database and sending JSON to frontend
#[derive(Queryable, Selectable, Serialize, Deserialize, Debug)]
#[diesel(table_name = medicines)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct Medicine {
    pub batch_id: String,
    pub medicine_name: String,
    pub combination: String,
    pub date_of_expiry: NaiveDate,
    pub manufacturer: String,
    pub price: f32,
    pub purpose: String,
}

// RECEIVING JSON from frontend and INSERTING into database
#[derive(Insertable, Deserialize, Debug)]
#[diesel(table_name = medicines)]
pub struct NewMedicine {
    pub batch_id: String,
    pub medicine_name: String,
    pub combination: String,
    pub date_of_expiry: NaiveDate,
    pub manufacturer: String,
    pub price: f32,
    pub purpose: String,
}