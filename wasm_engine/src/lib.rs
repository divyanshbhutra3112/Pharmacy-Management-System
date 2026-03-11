use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use chrono::{NaiveDate, Duration};

#[derive(Serialize, Deserialize, Clone)]
pub struct Medicine {
    pub batch_id: String,
    pub medicine_name: String,
    pub combination: String,
    pub date_of_expiry: NaiveDate,
    pub manufacturer: String,
    pub price: f32,
    pub purpose: String,
}

#[wasm_bindgen]
pub fn filter_medicines(
    json_data: &str,
    filter_mode: &str,
    search_text: &str,
    filter_manufacturer: &str,
    filter_purpose: &str,
    today_str: &str
) -> String {
    // Parse the JSON array
    let medicines: Vec<Medicine> = serde_json::from_str(json_data).unwrap_or_else(|_| vec![]);
    let today = NaiveDate::parse_from_str(today_str, "%Y-%m-%d").unwrap();
    let search_lower = search_text.to_lowercase();

    let filtered: Vec<Medicine> = medicines.into_iter().filter(|med| {
        // 1. Date Check
        let matches_mode = match filter_mode {
            "expired_3_days" => med.date_of_expiry == today - Duration::days(3),
            "expire_10_days" => med.date_of_expiry == today + Duration::days(10),
            _ => true,
        };

        // 2. Omni-Search Check (Looks across Name, Combination, and Batch ID)
        let matches_search = search_text.is_empty() ||
            med.medicine_name.to_lowercase().contains(&search_lower) ||
            med.combination.to_lowercase().contains(&search_lower) ||
            med.batch_id.to_lowercase().contains(&search_lower);

        // 3. Dropdown Checks
        let matches_mfg = filter_manufacturer.is_empty() || filter_manufacturer == "All" || med.manufacturer == filter_manufacturer;
        let matches_prp = filter_purpose.is_empty() || filter_purpose == "All" || med.purpose == filter_purpose;

        // Keep the record only if it passes ALL active filters
        matches_mode && matches_search && matches_mfg && matches_prp
    }).collect();

    serde_json::to_string(&filtered).unwrap()
}