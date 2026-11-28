import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as menuModel from '../models/menuModel.js';
import { HttpError } from '../utils/httpError.js';
import { clean, toId, toMoney, toWholeNumber } from '../utils/validate.js';

const TONES = ['pink', 'coral', 'peach', 'gold', 'red', 'orange'];

// Images are saved in <project root>/images/menu/

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MENU_IMAGE_DIR = path.join(projectRoot, 'images', 'menu');
const MENU_IMAGE_URL_PREFIX = 'images/menu/';
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

const readFields = (body) => {
    const name = clean(body.name);

    if (!name) {
        throw new HttpError(400, 'Food name is required.');
    }
    if (name.length > 120) {
        throw new HttpError(400, 'Food name is too long.');
    }

    if (!name) throw new HttpError(400, 'Food name is required.');
    if (name.length > 120) throw new HttpError(400, 'Food name is too long.');
    return {
        name,
        description: clean(body.description).slice(0, 255),
        category: clean(body.category).slice(0, 60) || 'Korean Food',
        price: toMoney(body.price, 'Price'),
        emoji: clean(body.emoji).slice(0, 16) || '🍽️'
    };
}

const guardDuplicate = (error) => {
    if (error.code === 'ER_DUP_ENTRY') {
        throw new HttpError(409, 'A menu item with that name already exists.');
    }
    if (error.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'A menu item with that name already exists.');
    throw error;
}

export const fetchAll = (admin = false) => {
    return menuModel.fetchAll({ includeArchived: admin });
}

const requireItem = async (id) => {
    const item = await menuModel.findById(toId(id));
    if (!item) {
        throw new HttpError(404, 'Menu item not found.');
    }
    if (!item) throw new HttpError(404, 'Menu item not found.');
    return item;
}

export const create = async (body) => {
    const fields = readFields(body);
    const stock = toWholeNumber(body.stock ?? 0, 'Stock', { max: 100000 });
    const tone = TONES.includes(body.tone) ? body.tone : TONES[Math.floor(Math.random() * TONES.length)];
    const id = await menuModel.insert({ ...fields, stock, tone, imagePath: null }).catch(guardDuplicate);
    return menuModel.findById(id);
}

export const update = async (id, body) => {
    const item = await requireItem(id);
    await menuModel.update(item.id, readFields(body)).catch(guardDuplicate);
    return menuModel.findById(item.id);
}

export const setAvailability = async (id, available) => {
    const item = await requireItem(id);
    await menuModel.setAvailability(item.id, Boolean(available));
    return menuModel.findById(item.id);
}

const detectImageExtension = (b) => {
    if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
    if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
    if (b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'webp';
    return null;
}

export const setImage = async (id, buffer) => {
    const item = await requireItem(id);

    if (!Buffer.isBuffer(buffer) || !buffer.length) {
        throw new HttpError(400, 'Choose a picture to upload.');
    }
    if (buffer.length > MAX_IMAGE_BYTES) {
        throw new HttpError(413, 'The picture is too large. Maximum size is 3 MB.');
    }

    const ext = detectImageExtension(buffer);

    if (!ext) {
        throw new HttpError(400, 'The picture must be a JPG, PNG or WEBP image.');
    }

    // Make sure the images/menu folder exists
    await fs.mkdir(MENU_IMAGE_DIR, { recursive: true });

    const fileName = `${item.id}-${Date.now()}.${ext}`;
    await fs.writeFile(path.join(MENU_IMAGE_DIR, fileName), buffer);
    await menuModel.setImage(item.id, MENU_IMAGE_URL_PREFIX + fileName);

    // Remove the previous picture so old files do not pile up.
    if (item.image_path && item.image_path.startsWith(MENU_IMAGE_URL_PREFIX)) {
        await fs.unlink(path.join(MENU_IMAGE_DIR, path.basename(item.image_path))).catch(() => {});
    }

    return menuModel.findById(item.id);
}

export const setStock = async (id, stock) => {
    const item = await requireItem(id);
    await menuModel.setStock(item.id, toWholeNumber(stock, 'Stock', { max: 100000 }));
    return menuModel.findById(item.id);
}

export const setArchived = async (id, archived) => {
    const item = await requireItem(id);
    await menuModel.setArchived(item.id, Boolean(archived));
    if (!Buffer.isBuffer(buffer) || !buffer.length) throw new HttpError(400, 'Choose a picture to upload.');
    if (buffer.length > MAX_IMAGE_BYTES) throw new HttpError(413, 'The picture is too large. Maximum size is 3 MB.');
    const ext = detectImageExtension(buffer);
    if (!ext) throw new HttpError(400, 'The picture must be a JPG, PNG or WEBP image.');
    await fs.mkdir(MENU_IMAGE_DIR, { recursive: true });
    const fileName = `${item.id}-${Date.now()}.${ext}`;
    await fs.writeFile(path.join(MENU_IMAGE_DIR, fileName), buffer);
    await menuModel.setImage(item.id, MENU_IMAGE_URL_PREFIX + fileName);
    if (item.image_path && item.image_path.startsWith(MENU_IMAGE_URL_PREFIX)) {
        await fs.unlink(path.join(MENU_IMAGE_DIR, path.basename(item.image_path))).catch(() => {});
    }
    return menuModel.findById(item.id);
}

export const setArchived = async (id, archived) => {
    const item = await requireItem(id);
    await menuModel.setArchived(item.id, Boolean(archived));
    return menuModel.findById(item.id);
}

// ---- Task 2.2.1: added setStock ----
export const setStock = async (id, stock) => {
    const item = await requireItem(id);
    await menuModel.setStock(item.id, toWholeNumber(stock, 'Stock', { max: 100000 }));
    return menuModel.findById(item.id);
}
