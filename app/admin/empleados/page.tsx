'use client';

import Link from 'next/link';
import { useState } from 'react';

interface DayEntry {
  day: number;
  entry1: string;
  exit1: string;
  entry2: string;
  exit2: string;
  absence: 'none' | 'morning' | 'afternoon' | 'all';
  notes: string;
}

interface Timesheet {
  month: number;
  year: number;
  employee: string;
  days: DayEntry[];
}

const employees = [
  { id: '1', name: 'Maria González' },
  { id: '2', name: 'José López' },
];

export default function EmpleadosPage() {
  const [selectedEmployee, setSelectedEmployee] = useState(employees[0].name);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [timesheet, setTimesheet] = useState<Timesheet>({
    month: selectedMonth,
    year: selectedYear,
    employee: selectedEmployee,
    days: Array.from({ length: 31 }, (_, i) => ({
      day: i + 1,
      entry1: '',
      exit1: '',
      entry2: '',
      exit2: '',
      absence: 'none',
      notes: '',
    })),
  });

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month, 0).getDate();
  };

  const handleDayChange = (day: number, field: string, value: string) => {
    setTimesheet({
      ...timesheet,
      days: timesheet.days.map((d) =>
        d.day === day ? { ...d, [field]: value } : d
      ),
    });
  };

  const calculateDailyHours = (day: DayEntry) => {
    if (day.absence !== 'none') return '—';
    if (!day.entry1 || !day.exit1) return '—';

    const [h1, m1] = day.entry1.split(':').map(Number);
    const [h2, m2] = day.exit1.split(':').map(Number);
    let hours = h2 - h1 + (m2 - m1) / 60;

    if (day.entry2 && day.exit2) {
      const [h3, m3] = day.entry2.split(':').map(Number);
      const [h4, m4] = day.exit2.split(':').map(Number);
      hours += h4 - h3 + (m4 - m3) / 60;
    }

    return hours.toFixed(1);
  };

  const calculateMonthlyHours = () => {
    return timesheet.days
      .filter((d) => d.day <= getDaysInMonth(selectedMonth, selectedYear))
      .reduce((sum, d) => {
        const hours = parseFloat(calculateDailyHours(d));
        return sum + (isNaN(hours) ? 0 : hours);
      }, 0);
  };

  const monthlyHours = calculateMonthlyHours();
  const expectedHours = getDaysInMonth(selectedMonth, selectedYear) * 8;
  const overtime = Math.max(0, monthlyHours - expectedHours);

  const handleSave = () => {
    alert(`Registro guardado para ${selectedEmployee} - ${selectedMonth}/${selectedYear}`);
  };

  const handlePrint = () => {
    window.print();
  };

  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
  const months = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];
  const years = Array.from({ length: 5 }, (_, i) => selectedYear - 2 + i);

  return (
    <div className="min-h-screen bg-mavic-beige">
      {/* Header */}
      <header className="bg-gradient-to-r from-mavic-pink to-mavic-gold text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Control de Horarios</h1>
            <p className="text-white/80 mt-1">Registro diario de horas trabajadas</p>
          </div>
          <Link
            href="/admin/dashboard"
            className="text-white hover:text-gray-100 font-semibold transition"
          >
            ← Volver
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Controls */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="grid md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Empleado
              </label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.name}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mes
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink"
              >
                {months.map((month, i) => (
                  <option key={i} value={i + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Año
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex-1 bg-mavic-pink hover:bg-mavic-pink/90 text-white font-bold py-2 px-4 rounded-lg transition"
              >
                Guardar
              </button>
              <button
                onClick={handlePrint}
                className="flex-1 bg-mavic-gold hover:bg-mavic-gold/90 text-white font-bold py-2 px-4 rounded-lg transition"
              >
                Imprimir
              </button>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-semibold mb-2">HORAS TRABAJADAS</p>
            <p className="text-3xl font-bold text-mavic-pink">{monthlyHours.toFixed(1)}</p>
            <p className="text-gray-500 text-xs mt-2">de {expectedHours} esperadas</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-semibold mb-2">HORAS EXTRAS</p>
            <p className="text-3xl font-bold text-mavic-gold">{overtime.toFixed(1)}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-semibold mb-2">DÍAS REGISTRADOS</p>
            <p className="text-3xl font-bold text-mavic-black">
              {timesheet.days.filter((d) => d.day <= daysInMonth && (d.entry1 || d.absence !== 'none')).length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-semibold mb-2">EMPLEADO</p>
            <p className="text-lg font-bold text-gray-800">{selectedEmployee}</p>
          </div>
        </div>

        {/* Timesheet Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-bold text-mavic-black">
              {months[selectedMonth - 1]} {selectedYear}
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 w-12">
                    Día
                  </th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700">
                    Entrada 1
                  </th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700">
                    Salida 1
                  </th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700">
                    Entrada 2
                  </th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700">
                    Salida 2
                  </th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700">
                    Total
                  </th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700">
                    Ausencia
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Notas
                  </th>
                </tr>
              </thead>
              <tbody>
                {timesheet.days
                  .filter((d) => d.day <= daysInMonth)
                  .map((day) => {
                    const dayOfWeek = new Date(
                      selectedYear,
                      selectedMonth - 1,
                      day.day
                    ).getDay();
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                    return (
                      <tr
                        key={day.day}
                        className={isWeekend ? 'bg-gray-50' : 'hover:bg-gray-50'}
                      >
                        <td className="px-4 py-3 font-semibold text-gray-700">
                          {day.day}
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="time"
                            value={day.entry1}
                            onChange={(e) =>
                              handleDayChange(day.day, 'entry1', e.target.value)
                            }
                            disabled={day.absence !== 'none'}
                            className="w-full px-2 py-1 border border-mavic-beige-dark rounded text-xs focus:outline-none focus:ring-2 focus:ring-mavic-pink disabled:bg-gray-100"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="time"
                            value={day.exit1}
                            onChange={(e) =>
                              handleDayChange(day.day, 'exit1', e.target.value)
                            }
                            disabled={day.absence !== 'none'}
                            className="w-full px-2 py-1 border border-mavic-beige-dark rounded text-xs focus:outline-none focus:ring-2 focus:ring-mavic-pink disabled:bg-gray-100"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="time"
                            value={day.entry2}
                            onChange={(e) =>
                              handleDayChange(day.day, 'entry2', e.target.value)
                            }
                            disabled={day.absence !== 'none'}
                            className="w-full px-2 py-1 border border-mavic-beige-dark rounded text-xs focus:outline-none focus:ring-2 focus:ring-mavic-pink disabled:bg-gray-100"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="time"
                            value={day.exit2}
                            onChange={(e) =>
                              handleDayChange(day.day, 'exit2', e.target.value)
                            }
                            disabled={day.absence !== 'none'}
                            className="w-full px-2 py-1 border border-mavic-beige-dark rounded text-xs focus:outline-none focus:ring-2 focus:ring-mavic-pink disabled:bg-gray-100"
                          />
                        </td>
                        <td className="px-3 py-3 text-center font-semibold">
                          {calculateDailyHours(day)}
                        </td>
                        <td className="px-3 py-3">
                          <select
                            value={day.absence}
                            onChange={(e) =>
                              handleDayChange(
                                day.day,
                                'absence',
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1 border border-mavic-beige-dark rounded text-xs focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                          >
                            <option value="none">—</option>
                            <option value="morning">Mañana</option>
                            <option value="afternoon">Tarde</option>
                            <option value="all">Todo</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={day.notes}
                            onChange={(e) =>
                              handleDayChange(day.day, 'notes', e.target.value)
                            }
                            placeholder="Notas..."
                            className="w-full px-2 py-1 border border-mavic-beige-dark rounded text-xs focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                          />
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
