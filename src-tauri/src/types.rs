use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct UsbDevice {
    pub port: String,               // COM3, /dev/ttyUSB0, …
    pub vid: u16,
    pub pid: u16,
    pub serial_number: Option<String>,
    pub product: Option<String>, 
    pub status: String,
    pub board_name: String,
}