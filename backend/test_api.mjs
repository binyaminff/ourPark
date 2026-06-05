import https from 'https';

const query = encodeURIComponent('יהושע השל 22 חיפה');

const fetchAPI = (url) => {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'ParkingRentalApp/1.0', 'Accept-Language': 'he,en;q=0.9' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
};

(async () => {
    console.log("=== NOMINATIM ===");
    try {
        const nom = await fetchAPI(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=5&addressdetails=1`);
        nom.forEach(n => console.log(n.display_name));
    } catch (e) {
        console.error(e);
    }

    console.log("\n=== PHOTON ===");
    try {
        const pho = await fetchAPI(`https://photon.komoot.io/api/?q=${query}&limit=5`);
        if (pho.features) pho.features.forEach(f => {
            let parts = [];
            if (f.properties.street) parts.push(f.properties.street + (f.properties.housenumber ? ' ' + f.properties.housenumber : ''));
            else if (f.properties.name) parts.push(f.properties.name);
            if (f.properties.city) parts.push(f.properties.city);
            console.log(parts.join(', '));
        });
    } catch (e) {
        console.error(e);
    }
})();
