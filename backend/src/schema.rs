// @generated automatically by Diesel CLI.

diesel::table! {
    medicines (batch_id) {
        batch_id -> Text,
        medicine_name -> Text,
        combination -> Text,
        date_of_expiry -> Date,
        manufacturer -> Text,
        price -> Float,
        purpose -> Text,
    }
}
