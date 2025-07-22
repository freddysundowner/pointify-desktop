import type { Express } from "express";
import {  makeOnlinePointifyRequest, makeLocalPointifyRequest } from "../config.js";
import fs from 'fs';
const CONFIG_FILE = 'initial_config.json';
let currentPrinterConfig = {
  initialsync: false
};

// Load config at startup

export async function registerInitsRoutes(app: Express) {
     
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            currentPrinterConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            console.log('✅ Loaded Initial config:', currentPrinterConfig);
        } catch (err) {
            console.error('❌ Failed to load printer config:', err);
        }
    } 
     try {
         if (currentPrinterConfig.initialsync === true) return;
         //getting global data like shopcategories and import locally
        console.log('initializing database');
        let data: any = await makeOnlinePointifyRequest('/sync/database/init', { method: 'GET' });
        // import to local database
        console.log('importing to local database ', data);
        let response: any = await makeLocalPointifyRequest('/sync/dump', { method: 'POST', body: JSON.stringify(data) });
        console.log('imported to local database ', response);
        if(response.success === true){
            try {
                currentPrinterConfig = { initialsync: true };
                fs.writeFileSync(CONFIG_FILE, JSON.stringify(currentPrinterConfig, null, 2));
                console.log('💾 Config saved:', currentPrinterConfig);
            } catch (err) {
                console.error('Failed to save config:', err);
            }
        }
           
        } catch (error) {
            console.log('Error initializing database:', error);
            
        }
};