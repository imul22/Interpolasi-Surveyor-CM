const express = require('express');
const path = require('path');
const app = express();
//const port = 3000;
const PORT = process.env.PORT || 3000;

// Middleware agar server bisa membaca data JSON dari body request
app.use(express.json());

// ROUTE HALAMAN
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/model-sederhana', (req, res) => res.sendFile(path.join(__dirname, 'model1.html')));
app.get('/model-tabel', (req, res) => res.sendFile(path.join(__dirname, 'model2.html')));
app.get('/trim-kapal', (req, res) => res.sendFile(path.join(__dirname, 'trim.html')));
app.get('/tangki-timbun', (req, res) => res.sendFile(path.join(__dirname, 'tangki.html')));
// --- LOGIKA PERHITUNGAN (DI SINI SEMUA RUMUSNYA) ---

// API untuk Model Sederhana
app.get('/api/hitung-sederhana', (req, res) => {
    const { x, x0, y0, x1, y1 } = req.query;
    const val = (n) => parseFloat(n);

    if (val(x1) === val(x0)) return res.status(400).json({ error: "x1 dan x0 tidak boleh sama" });

    const hasil = val(y0) + ((val(x) - val(x0)) * (val(y1) - val(y0))) / (val(x1) - val(x0));
    res.json({ hasil: hasil.toFixed(0) });
});

// API untuk Model Tabel
app.post('/api/hitung-tabel', (req, res) => {
    const { xTarget, data } = req.body; // Menerima array data dari client
    
    for (let i = 0; i < data.length - 1; i++) {
        let x0 = data[i].x, y0 = data[i].y;
        let x1 = data[i+1].x, y1 = data[i+1].y;

        if ((xTarget >= x0 && xTarget <= x1) || (xTarget <= x0 && xTarget >= x1)) {
            const hasil = y0 + ((xTarget - x0) * (y1 - y0)) / (x1 - x0);
            return res.json({ hasil: hasil.toFixed(0), range: `Baris ${i+1} & ${i+2}` });
        }
    }
    res.status(404).json({ error: "Nilai X di luar rentang tabel!" });
});
// API untuk Perhitungan Trim
app.get('/api/hitung-trim', (req, res) => {
    const da = parseFloat(req.query.da); // Draft Aft
    const df = parseFloat(req.query.df); // Draft Forward

    if (isNaN(da) || isNaN(df)) {
        return res.status(400).json({ error: "Input sarat air harus angka!" });
    }

    const trim = da - df;
    let status = "";

    if (trim > 0) status = "Trim by Stern (Nungging Belakang)";
    else if (trim < 0) status = "Trim by Head (Nungging Depan)";
    else status = "Even Keel (Rata)";

    res.json({ 
        trim: Math.abs(trim).toFixed(1), 
        status: status,
        rawTrim: trim 
    });
});

// API Hitung Volume Minyak dengan Koreksi Air Bebas (Free Water)
app.post('/api/hitung-tangki', (req, res) => {
    const { 
        tinggiCair, soundingBawah, volBawah, soundingAtas, volAtas, 
        tinggiAir, volAirBawah, soundingAirBawah, volAirAtas, soundingAirAtas,
        vcfManual, bblsFactor, mtFactor, ltFactor 
    } = req.body;

    const v = (n) => parseFloat(n) || 0;

    // 1. Interpolasi Total Observed Volume (M3/KL)
    const volTotalObs = v(volBawah) + ((v(tinggiCair) - v(soundingBawah)) * (v(volAtas) - v(volBawah))) / (v(soundingAtas) - v(soundingBawah));
    
    // 2. Interpolasi Free Water Volume (M3/KL)
    let volFreeWater = 0;
    if (v(tinggiAir) > 0) {
        volFreeWater = v(volAirBawah) + ((v(tinggiAir) - v(soundingAirBawah)) * (v(volAirAtas) - v(volAirBawah))) / (v(soundingAirAtas) - v(soundingAirBawah));
    }

    // 3. Net Observed Volume (NOV)
    const nov = volTotalObs - volFreeWater;

    // 4. PERHITUNGAN BERDASARKAN FAKTOR MANUAL
    const netKL15 = nov * v(vcfManual);           // Net KL @15 = Net Obs x VCF
    const barrels = netKL15 * v(bblsFactor);       // Barrels = Net KL @15 x Factor
    const metricTon = netKL15 * v(mtFactor);       // Metric Ton = Net KL @15 x Density@15 (Factor)
    const longTon = metricTon * v(ltFactor);       // Long Ton = Metric Ton x Factor

    res.json({
        totalObs: volTotalObs.toFixed(3),
        waterObs: volFreeWater.toFixed(3),
        nov: nov.toFixed(3),
        netKL15: netKL15.toFixed(3),
        barrels: barrels.toFixed(2),
        metricTon: metricTon.toFixed(3),
        longTon: longTon.toFixed(3)
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
//app.listen(port, () => console.log(`Server aktif di http://localhost:${port}`));