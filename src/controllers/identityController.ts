import { Request, Response } from 'express';
import db from '../app';
import { ContactData } from '../models/contact';
import { OkPacket, RowDataPacket } from 'mysql2';

export async function identifyContact(req: Request, res: Response) {
  const { email, phoneNumber } = req.body;

  try {
    // Fetch contacts matching the provided email or phone number
    const contacts = await getContactsByEmailOrPhoneNumber(email, phoneNumber);

    if (contacts.length === 0) {
      // Case: No matching email or phone number in the database, create a new primary contact
      const newPrimaryContact = await createContact(email, phoneNumber, null, 'primary');
      return res.json({
        contact: {
          primaryContactId: newPrimaryContact.id,
          emails: [newPrimaryContact.email],
          phoneNumbers: [newPrimaryContact.phoneNumber],
          secondaryContactIds: [],
        },
      });
    }

    // Check if the contact already exists
    const existingContact = contacts.find(contact => contact.email === email && contact.phoneNumber === phoneNumber);
    if (existingContact) {
      // Case: Contact already exists, return a response indicating that the data is already present
      return res.status(400).json({ message: 'Contact data already present' });
    }

    const emailMatch = contacts.find(contact => contact.email === email);
    const phoneMatch = contacts.find(contact => contact.phoneNumber === phoneNumber);

    if (emailMatch && phoneMatch && emailMatch.id === phoneMatch.id) {
      // Case a: Matching email and phone number in the same row
      return res.json({
        contact: await constructContactResponse(emailMatch),
      });
    } else if (emailMatch && phoneMatch && emailMatch.id !== phoneMatch.id) {
      // Case b: Matching email in one row and matching phone number in another row
      const primaryContact = getPrimaryContact([emailMatch, phoneMatch]);
      const secondaryContact = emailMatch.id > phoneMatch.id ? emailMatch : phoneMatch;

      await updateContact(secondaryContact.id, primaryContact.id, 'secondary');
      return res.json({
        contact: await constructContactResponse(primaryContact),
      });
    } else if (emailMatch) {
      // Case c: Found only email in the database
      const newSecondaryContact = await createContact(email, phoneNumber, emailMatch.id, 'secondary');
      return res.json({
        contact: await constructContactResponse(emailMatch),
      });
    } else if (phoneMatch) {
      // Case d: Found only phone number in the database
      const newSecondaryContact = await createContact(email, phoneNumber, phoneMatch.id, 'secondary');
      return res.json({
        contact: await constructContactResponse(phoneMatch),
      });
    }
  } catch (error) {
    console.error('Error identifying contact:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getContactsByEmailOrPhoneNumber(email: string | null, phoneNumber: string | null): Promise<ContactData[]> {
  return new Promise((resolve, reject) => {
    let query = 'SELECT * FROM Contact WHERE email = ? OR phoneNumber = ?';
    const values: (string | null)[] = [email, phoneNumber];

    db.query(query, values, (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results as ContactData[]);
      }
    });
  });
}

async function createContact(
  email: string | null,
  phoneNumber: string | null,
  linkedId: number | null,
  linkPrecedence: 'primary' | 'secondary'
): Promise<ContactData> {
  return new Promise((resolve, reject) => {
    const newContact = { email, phoneNumber, linkedId, linkPrecedence };

    db.query('INSERT INTO Contact SET ?', newContact, (err, result) => {
      if (err) {
        reject(err);
      } else {
        const insertResult = result as OkPacket;
        resolve({ id: insertResult.insertId, ...newContact } as ContactData);
      }
    });
  });
}

async function updateContact(id: number, linkedId: number, linkPrecedence: 'primary' | 'secondary'): Promise<void> {
  return new Promise((resolve, reject) => {
    db.query('UPDATE Contact SET linkedId = ?, linkPrecedence = ? WHERE id = ?', [linkedId, linkPrecedence, id], err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

async function constructContactResponse(contact: ContactData) {
  const contacts = await getAllContactsByPrimaryId(contact.id);

  console.log("All the contacts: ", contacts)

  const primaryContact = contacts.find(c => c.linkPrecedence === 'primary');
  console.log("the primary: ", primaryContact);

  const secondaryContacts = contacts.filter(c => c.linkPrecedence === 'secondary');
  console.log("the secondaryContacts: ", secondaryContacts);

  const emails = Array.from(new Set(contacts.map(c => c.email).filter(Boolean)));
  const phoneNumbers = Array.from(new Set(contacts.map(c => c.phoneNumber).filter(Boolean)));
  const secondaryContactId = primaryContact ? primaryContact.id : secondaryContacts[secondaryContacts.length - 1].id;

  return {
    primaryContactId: primaryContact ? primaryContact.id : secondaryContacts[secondaryContacts.length - 1].id,
    emails,
    phoneNumbers,
    secondaryContactId: secondaryContacts.length > 0 ? secondaryContacts[0].id : null,
  };
}

async function getAllContactsByPrimaryId(primaryId: number): Promise<ContactData[]> {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM Contact WHERE id = ? OR linkedId = ?', [primaryId, primaryId], (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results as ContactData[]);
      }
    });
  });
}

function getPrimaryContact(contacts: ContactData[]): ContactData {
  return contacts.reduce((primary, contact) => {
    if (!primary) return contact;
    return contact.createdAt < primary.createdAt ? contact : primary;
  });
}