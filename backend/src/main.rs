pub mod models;
pub mod schema;
pub mod db;
pub mod handlers;

use actix_web::{App, HttpServer, middleware::Logger};
use actix_cors::Cors;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Start a simple logger so we can see requests in the terminal
    unsafe {
        std::env::set_var("RUST_LOG", "info");
    }
    env_logger::init();

    println!("Starting backend server at http://127.0.0.1:8080");

    HttpServer::new(|| {
        // Configure CORS to allow our React frontend to talk to this API
        let cors = Cors::permissive();

        App::new()
            .wrap(cors)
            .wrap(Logger::default())
            .service(handlers::add_medicine)
            .service(handlers::get_medicines)
            .service(handlers::delete_medicine)
    })
        .bind(("127.0.0.1", 8080))?
        .run()
        .await
}