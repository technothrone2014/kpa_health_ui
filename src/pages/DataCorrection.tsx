import React, { useState } from "react";
import { AlertCircle, CheckCircle, Save, RefreshCw } from "lucide-react";
import { runCorrection } from "../api/dataCorrection";
import toast from "react-hot-toast";

interface CorrectionForm {
  year: number;
  month: number;
  day: number;
  userId: number;
  stationId: number;
  beforeHour?: number;
  beforeMinute?: number;
}

export default function DataCorrection() {
  const [form, setForm] = useState<CorrectionForm>({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    day: new Date().getDate(),
    userId: 39,
    stationId: 17,
    beforeHour: 8,
    beforeMinute: 52,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value === "" ? undefined : parseInt(value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    
    try {
      const data = await runCorrection(form);
      setResult({ success: true, message: data.message });
      toast.success("Correction completed successfully!");
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message;
      setResult({ success: false, message: errorMsg });
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm({
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      day: new Date().getDate(),
      userId: 39,
      stationId: 17,
      beforeHour: 8,
      beforeMinute: 52,
    });
    setResult(null);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Data Correction Tool</h1>
        <p className="text-gray-600 mt-1">
          Correct station assignments for tallies and clients based on date and time
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-6">
        {/* Date Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Date Selection</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <input
                type="number"
                name="year"
                value={form.year}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
              <input
                type="number"
                name="month"
                min="1"
                max="12"
                value={form.month}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
              <input
                type="number"
                name="day"
                min="1"
                max="31"
                value={form.day}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Assignment Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Assignment Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
              <input
                type="number"
                name="userId"
                value={form.userId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Station ID</label>
              <input
                type="number"
                name="stationId"
                value={form.stationId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Time Filter (Optional) */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Time Filter (Optional)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Before Hour (0-23)</label>
              <input
                type="number"
                name="beforeHour"
                min="0"
                max="23"
                value={form.beforeHour || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Before Minute (0-59)</label>
              <input
                type="number"
                name="beforeMinute"
                min="0"
                max="59"
                value={form.beforeMinute || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Leave empty to correct all records for the selected date
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Run Correction
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Reset Form
          </button>
        </div>

        {/* Result Display */}
        {result && (
          <div className={`p-4 rounded-lg ${
            result.success 
              ? "bg-green-50 border border-green-200" 
              : "bg-red-50 border border-red-200"
          }`}>
            <div className="flex items-start">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-2" />
              )}
              <div>
                <p className={`font-medium ${
                  result.success ? "text-green-800" : "text-red-800"
                }`}>
                  {result.success ? "Success" : "Error"}
                </p>
                <p className={`text-sm mt-1 ${
                  result.success ? "text-green-700" : "text-red-700"
                }`}>
                  {result.message}
                </p>
                {result.params && (
                  <pre className="mt-2 text-xs bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                    {JSON.stringify(result.params, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
