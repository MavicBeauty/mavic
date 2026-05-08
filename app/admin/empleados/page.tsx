'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface DayEntry {
  day: number;
  entry1: string;
  exit1: string;
  entry2: string;
  exit2: string;
  absence: 'none' | 'morning' | 'afternoon' | 'all';
  notes: string;
}

const EMPLOYEES = ['Maria', 'Jose'];

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function emptyDays(): DayEntry[] {
  return Array.from({ length: 31 }, (_, i) => ({
    day: i + 1, entry1: '', exit1: '', entry2: '', exit2: '', absence: 'none', notes: '',
  }));
}

export default function EmpleadosPage() {
  const [employee, setEmployee] = useState(EMPLOYEES[0]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [days, setDays] = useState<DayEntry[]>(emptyDays());
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const supabase = createClient();
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
  const daysInMonth = new Date(year, month, 0).getDate();

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('timesheets')
      .select('day_entries')
      .eq('employee_name', employee)
      .eq('period_month', month)
      .eq('period_year', year)
      .single();
    setDays(data?.day_entries ?? emptyDays());
  }, [employee, month, year]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const handleDayChange = (day: number, field: string, value: string) => {
    setDays(days.map((d) => d.day === day ? { ...d, [field]: value } : d));
  };

  const calcDailyHours = (d: DayEntry): number => {
    if (d.absence !== 'none' || !d.entry1 || !d.exit1) return 0;
    const [h1, m1] = d.entry1.split(':').map(Number);
    const [h2, m2] = d.exit1.split(':').map(Number);
    let h = h2 - h1 + (m2 - m1) / 60;
    if (d.entry2 && d.exit2) {
      const [h3, m3] = d.entry2.split(':').map(Number);
      const [h4, m4] = d.exit2.split(':').map(Number);
      h += h4 - h3 + (m4 - m3) / 60;
    }
    return Math.max(0, h);
  };

  const totalHours = days.filter((d) => d.day <= daysInMonth).reduce((s, d) => s + calcDailyHours(d), 0);
  const expectedHours = daysInMonth * 8;

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    const { error } = await supabase.from('timesheets').upsert({
      employee_name: employee,
      period_month: month,
      period_year: year,
      day_entries: days,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'employee_name,period_month,period_year' });

    setSaving(false);
    setSaveMsg(error ? `Error: ${error.message}` : '✓ Guardado');
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-mavic-beige">
      <header className="bg-gradient-to-r from-mavic-pink to-mavic-gold text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Control de Horarios</h1>
            <p className="text-white/80 mt-1">Registro diario de horas trabajadas</p>
          </div>
          <Link href="/admin/dashboard" className="text-white hover:text-gray-100 font-semibold transition">← Volver</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Controls */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="grid md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Empleada</label>
              <select value={employee} onChange={(e) => setEmployee(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink">
                {EMPLOYEES.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Mes</label>
              <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink">
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Año</label>
              <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink">
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-mavic-pink hover:bg-mavic-pink/90 text-white font-bold py-2 px-4 rounded-lg transition disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button onClick={handlePrint}
                className="flex-1 bg-mavic-gold hover:bg-mavic-gold/90 text-white font-bold py-2 px-4 rounded-lg transition">
                Imprimir
              </button>
            </div>
            <div>
              {saveMsg && (
                <p className={`text-sm font-semibold ${saveMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
                  {saveMsg}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-semibold mb-2">HORAS TRABAJADAS</p>
            <p className="text-3xl font-bold text-mavic-pink">{totalHours.toFixed(1)}</p>
            <p className="text-gray-500 text-xs mt-2">de {expectedHours} esperadas</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-semibold mb-2">HORAS EXTRAS</p>
            <p className="text-3xl font-bold text-mavic-gold">{Math.max(0, totalHours - expectedHours).toFixed(1)}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-semibold mb-2">EMPLEADA</p>
            <p className="text-2xl font-bold text-mavic-black">{employee}</p>
            <p className="text-gray-500 text-xs mt-2">{MONTHS[month - 1]} {year}</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-bold text-mavic-black">{MONTHS[month - 1]} {year} — {employee}</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 w-12">Día</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700">Entrada 1</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700">Salida 1</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700">Entrada 2</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700">Salida 2</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700">Total h</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700">Ausencia</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Notas</th>
                </tr>
              </thead>
              <tbody>
                {days.filter((d) => d.day <= daysInMonth).map((day) => {
                  const dow = new Date(year, month - 1, day.day).getDay();
                  const isWeekend = dow === 0 || dow === 6;
                  const hours = calcDailyHours(day);

                  return (
                    <tr key={day.day} className={isWeekend ? 'bg-gray-50' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-2 font-semibold text-gray-700">
                        {day.day}
                        <span className="text-gray-400 text-xs ml-1">
                          {['D','L','M','X','J','V','S'][dow]}
                        </span>
                      </td>
                      {(['entry1','exit1','entry2','exit2'] as const).map((field) => (
                        <td key={field} className="px-2 py-2">
                          <input type="time" value={day[field]}
                            onChange={(e) => handleDayChange(day.day, field, e.target.value)}
                            disabled={day.absence !== 'none'}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-mavic-pink disabled:bg-gray-100 disabled:text-gray-400" />
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center font-semibold text-mavic-black">
                        {hours > 0 ? hours.toFixed(1) : day.absence !== 'none' ? '—' : ''}
                      </td>
                      <td className="px-2 py-2">
                        <select value={day.absence} onChange={(e) => handleDayChange(day.day, 'absence', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-mavic-pink">
                          <option value="none">—</option>
                          <option value="morning">Mañana</option>
                          <option value="afternoon">Tarde</option>
                          <option value="all">Todo el día</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={day.notes}
                          onChange={(e) => handleDayChange(day.day, 'notes', e.target.value)}
                          placeholder="Notas..."
                          className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-mavic-pink" />
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-mavic-pink/10 font-bold border-t-2 border-mavic-pink/30">
                  <td className="px-4 py-3 text-mavic-black" colSpan={5}>TOTAL DEL MES</td>
                  <td className="px-3 py-3 text-center text-mavic-pink text-lg">{totalHours.toFixed(1)}</td>
                  <td colSpan={2} className="px-3 py-3 text-gray-500 text-sm">
                    {totalHours > expectedHours
                      ? `+${(totalHours - expectedHours).toFixed(1)}h extras`
                      : totalHours < expectedHours
                      ? `${(expectedHours - totalHours).toFixed(1)}h pendientes`
                      : 'Completo ✓'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
