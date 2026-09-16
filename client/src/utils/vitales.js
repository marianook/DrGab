export const VITALES_CONFIG = {
  Clinica: [
    { key: 'presionArterial', label: 'Presión arterial', unidad: 'mmHg', placeholder: '120/80' },
    { key: 'frecuenciaCardiaca', label: 'Frecuencia cardíaca', unidad: 'lpm', tipo: 'number' },
    { key: 'peso', label: 'Peso', unidad: 'kg', tipo: 'number' },
    { key: 'altura', label: 'Altura', unidad: 'cm', tipo: 'number' },
  ],
  Endocrinologia: [
    { key: 'glucemia', label: 'Glucemia', unidad: 'mg/dL', tipo: 'number' },
    { key: 'hba1c', label: 'HbA1c', unidad: '%', tipo: 'number' },
    { key: 'insulina', label: 'Insulina', unidad: 'UI', tipo: 'number' },
    { key: 'tsh', label: 'TSH', unidad: 'µUI/mL', tipo: 'number' },
    { key: 'colesterolTotal', label: 'Colesterol total', unidad: 'mg/dL', tipo: 'number' },
    { key: 'ldl', label: 'LDL', unidad: 'mg/dL', tipo: 'number' },
    { key: 'hdl', label: 'HDL', unidad: 'mg/dL', tipo: 'number' },
    { key: 'trigliceridos', label: 'Triglicéridos', unidad: 'mg/dL', tipo: 'number' },
  ],
};

export function calcularIMC(pesoKg, alturaCm) {
  const peso = Number(pesoKg);
  const altura = Number(alturaCm) / 100;
  if (!peso || !altura) return null;
  return Number((peso / (altura * altura)).toFixed(1));
}

export function calcularAlertas(especialidad, datosVitales = {}) {
  const alertas = [];

  if (especialidad === 'Clinica') {
    const [sistolica, diastolica] = String(datosVitales.presionArterial || '')
      .split('/')
      .map((v) => Number(v.trim()));
    if (sistolica && diastolica) {
      if (sistolica >= 140 || diastolica >= 90) alertas.push('⚠️ Presión arterial elevada (posible hipertensión).');
      else if (sistolica < 90 || diastolica < 60) alertas.push('⚠️ Presión arterial baja (posible hipotensión).');
    }
    const fc = Number(datosVitales.frecuenciaCardiaca);
    if (fc) {
      if (fc > 100) alertas.push('⚠️ Frecuencia cardíaca elevada (taquicardia).');
      else if (fc < 60) alertas.push('⚠️ Frecuencia cardíaca baja (bradicardia).');
    }
    const imc = calcularIMC(datosVitales.peso, datosVitales.altura);
    if (imc) {
      if (imc >= 30) alertas.push(`⚠️ IMC de ${imc} — rango de obesidad.`);
      else if (imc < 18.5) alertas.push(`⚠️ IMC de ${imc} — bajo peso.`);
    }
  }

  if (especialidad === 'Endocrinologia') {
    const glucemia = Number(datosVitales.glucemia);
    if (glucemia) {
      if (glucemia >= 180) alertas.push('🚨 Glucemia crítica alta (≥180 mg/dL) — evaluar ajuste de tratamiento.');
      else if (glucemia < 70) alertas.push('🚨 Glucemia crítica baja (<70 mg/dL) — riesgo de hipoglucemia.');
    }
    const hba1c = Number(datosVitales.hba1c);
    if (hba1c && hba1c >= 9) alertas.push('🚨 HbA1c crítica (≥9%) — mal control glucémico.');
    else if (hba1c && hba1c >= 7) alertas.push('⚠️ HbA1c por encima del objetivo (≥7%).');
    const tsh = Number(datosVitales.tsh);
    if (tsh) {
      if (tsh > 4.5) alertas.push('⚠️ TSH elevada (posible hipotiroidismo).');
      else if (tsh < 0.4) alertas.push('⚠️ TSH baja (posible hipertiroidismo).');
    }
    const ldl = Number(datosVitales.ldl);
    if (ldl && ldl >= 160) alertas.push('⚠️ LDL elevado (riesgo cardiovascular).');
  }

  return alertas;
}
