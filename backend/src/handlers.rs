use actix_web::{get, post, delete, web, HttpResponse, Responder};
use diesel::prelude::*;
use crate::models::{Medicine, NewMedicine};
use crate::db::establish_connection;
use crate::schema::medicines::dsl::*;

// POST endpoint to add a new medicine
#[post("/api/medicines")]
pub async fn add_medicine(medicine_data: web::Json<NewMedicine>) -> impl Responder {
    let mut connection = establish_connection();

    let new_medicine = NewMedicine {
        batch_id: medicine_data.batch_id.clone(),
        medicine_name: medicine_data.medicine_name.clone(),
        combination: medicine_data.combination.clone(),
        date_of_expiry: medicine_data.date_of_expiry,
        manufacturer: medicine_data.manufacturer.clone(),
        price: medicine_data.price,
        purpose: medicine_data.purpose.clone(),
    };

    let result = diesel::insert_into(medicines)
        .values(&new_medicine)
        .execute(&mut connection);

    match result {
        Ok(_) => HttpResponse::Created().json("Medicine added successfully"),
        Err(e) => HttpResponse::InternalServerError().body(format!("Error: {}", e)),
    }
}

// GET endpoint to fetch all medicines
#[get("/api/medicines")]
pub async fn get_medicines() -> impl Responder {
    let mut connection = establish_connection();

    let results = medicines
        .select(Medicine::as_select())
        .load(&mut connection);

    match results {
        Ok(data) => HttpResponse::Ok().json(data),
        Err(e) => HttpResponse::InternalServerError().body(format!("Error: {}", e)),
    }
}

// DELETE endpoint to remove a medicine by batch_id
#[delete("/api/medicines/{id}")]
pub async fn delete_medicine(path: web::Path<String>) -> impl Responder {
    let id = path.into_inner();
    let mut connection = establish_connection();

    // Delete where the database batch_id matches the URL parameter
    let result = diesel::delete(medicines.filter(batch_id.eq(id)))
        .execute(&mut connection);

    match result {
        Ok(deleted_rows) if deleted_rows > 0 => HttpResponse::Ok().json("Deleted successfully"),
        Ok(_) => HttpResponse::NotFound().json("Batch ID not found"),
        Err(e) => HttpResponse::InternalServerError().body(format!("Error: {}", e)),
    }
}