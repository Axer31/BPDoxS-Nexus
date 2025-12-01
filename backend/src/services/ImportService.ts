import fs from 'fs';
import { parse } from 'csv-parse';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ImportService {

  static async importClients(filePath: string) {
    const results: any[] = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(parse({ columns: true, trim: true, skip_empty_lines: true }))
        .on('data', (row) => {
          // Normalize Keys (case insensitive handling could be added here)
          // We expect headers: company_name, email, phone, gst, state_code, address, city, zip
          
          if (row.company_name) {
            results.push({
              company_name: row.company_name,
              email: row.email || null,
              phone: row.phone || null,
              tax_id: row.gst || row.tax_id || null, // Handle common variations
              state_code: row.state_code ? parseInt(row.state_code) : null,
              country: row.country || 'India',
              // Construct the JSON address object
              addresses: {
                billing: {
                  street: row.address || '',
                  city: row.city || '',
                  zip: row.zip || ''
                }
              }
            });
          }
        })
        .on('error', (error) => reject(error))
        .on('end', async () => {
          try {
            // Bulk Insert
            // @ts-ignore
            const count = await prisma.client.createMany({
              data: results,
              skipDuplicates: true // Prevent crashing on duplicate emails/names if unique constraint exists
            });
            
            // Clean up file
            fs.unlinkSync(filePath);
            resolve({ imported: count.count, total: results.length });
          } catch (dbError) {
            reject(dbError);
          }
        });
    });
  }
}