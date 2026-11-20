import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PillIllustration, SHAPES_LIST, COLORS_LIST } from '../../components/PillIllustration';
import { PillShape, PillColor } from '../../types';
import { api } from '../../services/api';
import { useAccessibility } from '../../context/AccessibilityContext';
import {
  Mic,
  Camera,
  Check,
  ChevronRight,
  ChevronLeft,
  Plus,
  Minus,
  Clock,
  Calendar,
  AlertTriangle,
  Package,
  FileText,
  Save,
} from 'lucide-react';

// ~100 common medicines for autocomplete
const COMMON_MEDICINES = [
  'Metformin', 'Amlodipine', 'Telmisartan', 'Atorvastatin', 'Aspirin', 'Paracetamol',
  'Insulin', 'Levothyroxine', 'Omeprazole', 'Losartan', 'Lisinopril', 'Simvastatin',
  'Metoprolol', 'Hydrochlorothiazide', 'Gabapentin', 'Sertraline', 'Albuterol', 'Pantoprazole',
  'Furosemide', 'Montelukast', 'Escitalopram', 'Rosuvastatin', 'Carvedilol', 'Tamsulosin',
  'Prednisone', 'Citalopram', 'Duloxetine', 'Warfarin', 'Clopidogrel', 'Ciprofloxacin',
  'Amoxicillin', 'Azithromycin', 'Doxycycline', 'Cephalexin', 'Ibuprofen', 'Naproxen',
  'Diclofenac', 'Tramadol', 'Zolpidem', 'Alprazolam', 'Lorazepam', 'Clonazepam',
  'Ranitidine', 'Famotidine', 'Cetirizine', 'Loratadine', 'Fexofenadine', 'Fluticasone',
  'Allopurinol', 'Potassium Chloride', 'Spironolactone', 'Digoxin', 'Diltiazem', 'Verapamil',
  'Glimepiride', 'Glipizide', 'Sitagliptin', 'Empagliflozin', 'Dapagliflozin', 'Finasteride',
  'Donepezil', 'Memantine', 'Levodopa', 'Carbidopa', 'Baclofen', 'Cyclobenzaprine',
  'Methotrexate', 'Folic Acid', 'Vitamin D3', 'Vitamin B12', 'Calcium Carbonate', 'Iron Sulfate',
  'Multivitamin', 'Eye Lubricant Drops', 'Cough Syrup', 'Betamethasone', 'Hydrocortisone',
  'Ondansetron', 'Loperamide', 'Senna', 'Bisacodyl', 'Lactulose', 'Nitrofurantoin'
];

export const MedicineWizard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useAccessibility();

  // If caregiver is adding for a specific patient
  const queryParams = new URLSearchParams(location.search);
  const patientId = queryParams.get('patient_id');

  // Wizard state: Step 1 to 10
  const [step, setStep] = useState(1);

  // Form values
  const [pillShape, setPillShape] = useState<PillShape>('round');
  const [pillColor, setPillColor] = useState<PillColor>('white');
  const [pillColor2, setPillColor2] = useState<PillColor>('pink');
  const [pillImageUrl, setPillImageUrl] = useState<string>('');

  const [name, setName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [isListening, setIsListening] = useState(false);

  const [strengthVal, setStrengthVal] = useState(500);
  const [strengthUnit, setStrengthUnit] = useState('mg');
  const [quantity, setQuantity] = useState('1 tablet');

  const [timeSlots, setTimeSlots] = useState<{ time: string; label: string }[]>([
    { time: '08:00', label: 'Morning' },
  ]);

  const [frequency, setFrequency] = useState<'every_day' | 'specific_days' | 'every_n_hours' | 'every_other_day' | 'prn'>('every_day');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Wed', 'Fri']);

  const [durationType, setDurationType] = useState<'ongoing' | 'days' | 'until_date'>('ongoing');
  const [durationDays, setDurationDays] = useState(30);

  const [instructions, setInstructions] = useState<'before_food' | 'with_food' | 'after_food' | 'empty_stomach'>('with_food');
  const [notes, setNotes] = useState('');

  const [isCritical, setIsCritical] = useState(false);

  const [currentStock, setCurrentStock] = useState(30);
  const [refillThreshold, setRefillThreshold] = useState(5);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Speech recognition for name input
  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setName(transcript);
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Photo upload / capture
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPillImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveMedicine = async () => {
    setSubmitting(true);
    setError('');

    try {
      const payload: any = {
        name,
        generic_name: genericName || null,
        pill_shape: pillShape,
        pill_color: pillColor,
        pill_color2: pillShape === 'two_tone_capsule' ? pillColor2 : null,
        pill_image_url: pillImageUrl || null,
        strength: `${strengthVal} ${strengthUnit}`,
        quantity_per_dose: quantity,
        instructions,
        time_slots: timeSlots,
        frequency,
        frequency_details: frequency === 'specific_days' ? selectedDays : null,
        duration_type: durationType,
        duration_value: durationType === 'days' ? String(durationDays) : null,
        is_critical: isCritical ? 1 : 0,
        current_stock: currentStock,
        refill_threshold: refillThreshold,
        notes: notes || null,
      };

      if (patientId) {
        payload.patient_id = parseInt(patientId, 10);
      }

      await api.request('/medicines', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (patientId) {
        navigate('/caregiver/medicines');
      } else {
        navigate('/elderly/medicines');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save medicine');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-28">
      {/* Step Indicator Header */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => (step > 1 ? setStep(step - 1) : navigate(-1))}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 font-extrabold text-base sm:text-lg border border-slate-200 transition"
        >
          <ChevronLeft className="w-6 h-6" />
          <span>Back</span>
        </button>

        <div className="text-center">
          <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            Step {step} of 10
          </span>
          <div className="w-36 sm:w-48 bg-slate-200 h-2.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300"
              style={{ width: `${(step / 10) * 100}%` }}
            />
          </div>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="text-slate-400 hover:text-slate-600 font-bold text-lg px-2"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border-2 border-red-300 text-red-800 font-bold text-lg">
          {error}
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-lg border border-slate-200 min-h-[500px] flex flex-col justify-between">
        {/* STEP 1: SELECT TABLET / FORM WITH VISUAL SVG & PHOTO */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                What does your medicine look like?
              </h3>
              <p className="text-lg text-slate-600 mt-1 font-medium">
                Tap a shape and color to preview, or take a picture of the pill.
              </p>
            </div>

            {/* Live Large Preview */}
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-3xl border-2 border-slate-200 shadow-inner">
              <PillIllustration
                shape={pillShape}
                color={pillColor}
                color2={pillShape === 'two_tone_capsule' ? pillColor2 : undefined}
                imageUrl={pillImageUrl}
                size={140}
              />
              <span className="mt-3 font-extrabold text-slate-800 text-xl capitalize">
                {pillImageUrl ? 'Custom Photo' : `${pillColor} ${pillShape.replace('_', ' ')}`}
              </span>
            </div>

            {/* Photo capture / upload button */}
            <div className="flex justify-center">
              <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-lg border-2 border-indigo-200 transition">
                <Camera className="w-6 h-6" />
                <span>{pillImageUrl ? 'Change Pill Photo' : 'Take or Upload Photo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoCapture}
                  className="hidden"
                />
              </label>
              {pillImageUrl && (
                <button
                  type="button"
                  onClick={() => setPillImageUrl('')}
                  className="ml-3 text-red-600 font-bold text-base hover:underline"
                >
                  Remove Photo
                </button>
              )}
            </div>

            {/* Tablet Shapes */}
            <div>
              <label className="block text-slate-900 text-lg font-black mb-3">1. Select Shape or Form</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-56 overflow-y-auto p-1">
                {SHAPES_LIST.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setPillShape(s.id);
                      setPillImageUrl('');
                    }}
                    className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-2 text-center transition ${
                      pillShape === s.id && !pillImageUrl
                        ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <PillIllustration shape={s.id} color={pillColor} size={48} showShadow={false} />
                    <span className="text-sm sm:text-base font-bold text-slate-800 leading-tight">
                      {s.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Pill Colors */}
            <div>
              <label className="block text-slate-900 text-lg font-black mb-3">2. Select Color</label>
              <div className="grid grid-cols-5 gap-2 sm:gap-3">
                {COLORS_LIST.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setPillColor(c.id)}
                    className={`p-2 rounded-2xl border-2 flex flex-col items-center gap-1 transition ${
                      pillColor === c.id
                        ? 'border-blue-600 ring-2 ring-blue-300 scale-105'
                        : 'border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full border border-black/20 shadow-sm"
                      style={{ backgroundColor: c.hex }}
                    />
                    <span className="text-xs font-bold text-slate-700 truncate w-full text-center">
                      {c.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Secondary Color if Two-Tone Capsule */}
            {pillShape === 'two_tone_capsule' && (
              <div>
                <label className="block text-slate-900 text-lg font-black mb-3">Second Color (Right Half)</label>
                <div className="grid grid-cols-5 gap-2">
                  {COLORS_LIST.map((c) => (
                    <button
                      key={`c2_${c.id}`}
                      type="button"
                      onClick={() => setPillColor2(c.id)}
                      className={`p-2 rounded-2xl border-2 flex flex-col items-center gap-1 transition ${
                        pillColor2 === c.id
                          ? 'border-blue-600 ring-2 ring-blue-300'
                          : 'border-slate-200'
                      }`}
                    >
                      <div
                        className="w-7 h-7 rounded-full border border-black/20"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span className="text-xs font-bold text-slate-700 truncate">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: NAME (WITH AUTOCOMPLETE & VOICE) */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                What is the medicine name?
              </h3>
              <p className="text-lg text-slate-600 mt-1 font-medium">
                Type the name or tap the microphone to speak.
              </p>
            </div>

            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Metformin or Amlodipine"
                className="w-full text-2xl font-bold p-5 pr-16 rounded-3xl border-3 border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none"
                autoFocus
              />

              <button
                type="button"
                onClick={handleVoiceInput}
                className={`absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-2xl transition ${
                  isListening
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                }`}
                title="Speak Medicine Name"
              >
                <Mic className="w-7 h-7" />
              </button>
            </div>

            {/* Autocomplete suggestion chips */}
            <div>
              <span className="text-sm font-extrabold uppercase tracking-wide text-slate-500">
                Common Medicines:
              </span>
              <div className="flex flex-wrap gap-2 mt-2 max-h-56 overflow-y-auto p-1">
                {COMMON_MEDICINES.filter((m) =>
                  !name || m.toLowerCase().includes(name.toLowerCase())
                ).slice(0, 16).map((med) => (
                  <button
                    key={med}
                    type="button"
                    onClick={() => setName(med)}
                    className="px-4 py-2 bg-slate-100 hover:bg-blue-600 hover:text-white rounded-xl text-base font-bold text-slate-800 transition"
                  >
                    {med}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-700 text-base font-bold mb-1">
                Generic Name / Notes (Optional)
              </label>
              <input
                type="text"
                value={genericName}
                onChange={(e) => setGenericName(e.target.value)}
                placeholder="e.g. Metformin Hydrochloride"
                className="w-full text-lg p-3.5 rounded-2xl border border-slate-300 font-medium"
              />
            </div>
          </div>
        )}

        {/* STEP 3: DOSAGE */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                What is the strength and dose quantity?
              </h3>
              <p className="text-lg text-slate-600 mt-1 font-medium">
                Adjust with the plus and minus buttons.
              </p>
            </div>

            {/* Stepper for strength */}
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200">
              <span className="block text-center text-slate-600 font-bold text-lg mb-2">Strength</span>
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setStrengthVal(Math.max(1, strengthVal - (strengthVal >= 50 ? 50 : 5)))}
                  className="w-16 h-16 rounded-2xl bg-white hover:bg-slate-100 border-2 border-slate-300 font-black text-3xl flex items-center justify-center shadow-sm"
                >
                  <Minus className="w-8 h-8" />
                </button>

                <div className="text-center min-w-[140px]">
                  <span className="text-4xl sm:text-5xl font-black text-blue-700">{strengthVal}</span>
                  <span className="text-2xl font-bold text-slate-700 ml-2">{strengthUnit}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setStrengthVal(strengthVal + (strengthVal >= 50 ? 50 : 5))}
                  className="w-16 h-16 rounded-2xl bg-white hover:bg-slate-100 border-2 border-slate-300 font-black text-3xl flex items-center justify-center shadow-sm"
                >
                  <Plus className="w-8 h-8" />
                </button>
              </div>

              {/* Units */}
              <div className="flex justify-center gap-2 mt-4">
                {['mg', 'mcg', 'g', 'ml', 'drops', 'puffs'].map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setStrengthUnit(u)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-sm ${
                      strengthUnit === u ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity per dose presets */}
            <div>
              <label className="block text-slate-900 text-lg font-black mb-2">Quantity Per Dose</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {['1 tablet', '½ tablet', '2 tablets', '5 ml', '10 ml', '1 capsule', '2 puffs', '1 drop'].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuantity(q)}
                    className={`p-3.5 rounded-2xl border-2 font-bold text-lg text-center transition ${
                      quantity === q
                        ? 'border-blue-600 bg-blue-50 text-blue-900 font-black'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: TIME SLOTS */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                What time do you take this medicine?
              </h3>
              <p className="text-lg text-slate-600 mt-1 font-medium">
                Tap preset cards or add custom reminder times.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {[
                { label: 'Morning', time: '08:00', icon: '🌅' },
                { label: 'Afternoon', time: '13:00', icon: '☀️' },
                { label: 'Evening', time: '18:00', icon: '🌆' },
                { label: 'Night', time: '21:00', icon: '🌙' },
              ].map((preset) => {
                const isSelected = timeSlots.some((t) => t.time === preset.time);
                return (
                  <button
                    key={preset.time}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setTimeSlots(timeSlots.filter((t) => t.time !== preset.time));
                      } else {
                        setTimeSlots([...timeSlots, { time: preset.time, label: preset.label }]);
                      }
                    }}
                    className={`min-h-[90px] p-4 rounded-3xl border-3 flex flex-col items-center justify-center gap-1 transition ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 text-blue-950 font-black ring-2 ring-blue-300'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-3xl">{preset.icon}</span>
                    <span className="text-xl font-bold">{preset.label}</span>
                    <span className="text-base font-extrabold text-blue-700">{preset.time}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom time picker */}
            <div className="pt-2 border-t border-slate-200">
              <span className="block text-slate-800 font-bold text-lg mb-2">Custom Time</span>
              <input
                type="time"
                onChange={(e) => {
                  if (e.target.value) {
                    setTimeSlots([...timeSlots, { time: e.target.value, label: 'Custom' }]);
                  }
                }}
                className="text-2xl font-bold p-3 rounded-2xl border-2 border-slate-300"
              />
            </div>
          </div>
        )}

        {/* STEP 5: FREQUENCY */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                How often do you take this medicine?
              </h3>
            </div>

            <div className="space-y-3">
              {[
                { id: 'every_day', title: 'Every Day', desc: 'Daily medication taken continuously' },
                { id: 'specific_days', title: 'Specific Days of the Week', desc: 'Choose exact days' },
                { id: 'every_other_day', title: 'Every Other Day', desc: 'Alternate days schedule' },
                { id: 'prn', title: 'Only When Needed (PRN)', desc: 'As-needed for pain or symptoms' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFrequency(f.id as any)}
                  className={`w-full p-5 rounded-2xl border-3 text-left transition flex items-center justify-between ${
                    frequency === f.id
                      ? 'border-blue-600 bg-blue-50 text-blue-950 font-black'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-800 font-bold'
                  }`}
                >
                  <div>
                    <h4 className="text-xl font-black">{f.title}</h4>
                    <p className="text-base text-slate-600 mt-0.5">{f.desc}</p>
                  </div>
                  {frequency === f.id && <Check className="w-8 h-8 text-blue-600 stroke-[3]" />}
                </button>
              ))}
            </div>

            {frequency === 'specific_days' && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="block font-bold text-slate-800 mb-2">Select Days:</span>
                <div className="grid grid-cols-7 gap-1">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setSelectedDays(
                          selectedDays.includes(d)
                            ? selectedDays.filter((x) => x !== d)
                            : [...selectedDays, d]
                        );
                      }}
                      className={`py-3 rounded-xl font-black text-base ${
                        selectedDays.includes(d) ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 6: DURATION */}
        {step === 6 && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                How long is this prescription for?
              </h3>
            </div>

            <div className="space-y-3">
              {[
                { id: 'ongoing', title: 'Ongoing / Long-Term', desc: 'No set end date (regular maintenance)' },
                { id: 'days', title: 'Fixed Number of Days', desc: 'e.g. 7-day antibiotic course' },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDurationType(d.id as any)}
                  className={`w-full p-5 rounded-2xl border-3 text-left transition flex items-center justify-between ${
                    durationType === d.id
                      ? 'border-blue-600 bg-blue-50 text-blue-950 font-black'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-800 font-bold'
                  }`}
                >
                  <div>
                    <h4 className="text-xl font-black">{d.title}</h4>
                    <p className="text-base text-slate-600 mt-0.5">{d.desc}</p>
                  </div>
                  {durationType === d.id && <Check className="w-8 h-8 text-blue-600 stroke-[3]" />}
                </button>
              ))}
            </div>

            {durationType === 'days' && (
              <div className="flex items-center gap-4 justify-center p-6 bg-slate-50 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setDurationDays(Math.max(1, durationDays - 1))}
                  className="w-12 h-12 rounded-xl bg-white border border-slate-300 font-bold text-2xl"
                >
                  -
                </button>
                <span className="text-3xl font-black text-blue-700">{durationDays} Days</span>
                <button
                  type="button"
                  onClick={() => setDurationDays(durationDays + 1)}
                  className="w-12 h-12 rounded-xl bg-white border border-slate-300 font-bold text-2xl"
                >
                  +
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 7: INSTRUCTIONS */}
        {step === 7 && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                How should this be taken with food?
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'before_food', title: 'Before Food', icon: '🍽️' },
                { id: 'with_food', title: 'With Food / Meal', icon: '🥗' },
                { id: 'after_food', title: 'After Food', icon: '☕' },
                { id: 'empty_stomach', title: 'On Empty Stomach', icon: '💧' },
              ].map((inst) => (
                <button
                  key={inst.id}
                  type="button"
                  onClick={() => setInstructions(inst.id as any)}
                  className={`p-5 rounded-2xl border-3 flex items-center gap-3 transition ${
                    instructions === inst.id
                      ? 'border-blue-600 bg-blue-50 text-blue-950 font-black'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-800 font-bold'
                  }`}
                >
                  <span className="text-3xl">{inst.icon}</span>
                  <span className="text-xl">{inst.title}</span>
                </button>
              ))}
            </div>

            <div>
              <label className="block text-slate-800 text-base font-bold mb-1">
                Special Notes / Doctor Instructions
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Drink a full glass of water. Do not lie down for 30 minutes."
                rows={3}
                className="w-full text-lg p-3 rounded-2xl border border-slate-300 font-medium"
              />
            </div>
          </div>
        )}

        {/* STEP 8: PRIORITY (CRITICAL MEDICINE) */}
        {step === 8 && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                Is this a Critical Medicine?
              </h3>
              <p className="text-lg text-slate-600 mt-1 font-medium">
                Critical medicines (e.g. Heart, Blood Pressure, Diabetes) escalate faster to your caregiver if unconfirmed.
              </p>
            </div>

            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setIsCritical(true)}
                className={`w-full p-6 rounded-3xl border-3 text-left transition flex items-center justify-between ${
                  isCritical
                    ? 'border-red-600 bg-red-50 text-red-950 font-black ring-2 ring-red-300'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-800 font-bold'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-red-600 text-white text-sm font-extrabold uppercase">
                      Yes, Critical
                    </span>
                    <h4 className="text-2xl font-black">Life-Critical Medicine</h4>
                  </div>
                  <p className="text-base text-slate-700 mt-2">
                    Alerts caregiver within 10 minutes if not confirmed. Used for BP, insulin, heart medications.
                  </p>
                </div>
                {isCritical && <Check className="w-8 h-8 text-red-600 stroke-[3]" />}
              </button>

              <button
                type="button"
                onClick={() => setIsCritical(false)}
                className={`w-full p-6 rounded-3xl border-3 text-left transition flex items-center justify-between ${
                  !isCritical
                    ? 'border-blue-600 bg-blue-50 text-blue-950 font-black ring-2 ring-blue-300'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-800 font-bold'
                }`}
              >
                <div>
                  <h4 className="text-2xl font-black">Standard Medication</h4>
                  <p className="text-base text-slate-600 mt-1">
                    Standard 20-30 minute escalation ladder (vitamins, pain relief, eye drops).
                  </p>
                </div>
                {!isCritical && <Check className="w-8 h-8 text-blue-600 stroke-[3]" />}
              </button>
            </div>
          </div>
        )}

        {/* STEP 9: STOCK & REFILL */}
        {step === 9 && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                Pill Stock & Refill Warning
              </h3>
              <p className="text-lg text-slate-600 mt-1 font-medium">
                Keep track of your supply and get notified when you run low.
              </p>
            </div>

            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-5">
              <div>
                <label className="block text-slate-900 text-lg font-black mb-2">
                  Current Supply (Total Tablets/Doses in Bottle)
                </label>
                <div className="flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStock(Math.max(0, currentStock - 5))}
                    className="w-14 h-14 rounded-2xl bg-white border border-slate-300 font-black text-2xl"
                  >
                    -
                  </button>
                  <span className="text-4xl font-black text-blue-700 min-w-[100px] text-center">
                    {currentStock}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentStock(currentStock + 5)}
                    className="w-14 h-14 rounded-2xl bg-white border border-slate-300 font-black text-2xl"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-900 text-base font-bold mb-2">
                  Alert me when stock falls below:
                </label>
                <div className="flex justify-center gap-3">
                  {[3, 5, 7, 10].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setRefillThreshold(t)}
                      className={`px-4 py-2 rounded-xl font-bold text-base ${
                        refillThreshold === t ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {t} doses
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 10: CONFIRMATION SUMMARY */}
        {step === 10 && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-3xl font-black text-slate-900">Review & Confirm Medicine</h3>
              <p className="text-lg text-slate-600 mt-1 font-medium">
                Please verify details before saving.
              </p>
            </div>

            {/* Big Summary Card */}
            <div className="p-6 sm:p-8 bg-blue-50/50 rounded-3xl border-3 border-blue-200 flex flex-col sm:flex-row items-center gap-6">
              <div className="p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-md">
                <PillIllustration
                  shape={pillShape}
                  color={pillColor}
                  color2={pillShape === 'two_tone_capsule' ? pillColor2 : undefined}
                  imageUrl={pillImageUrl}
                  size={120}
                />
              </div>

              <div className="text-center sm:text-left space-y-1">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <h4 className="text-3xl font-black text-slate-900">{name || 'Unnamed Medicine'}</h4>
                  {isCritical && (
                    <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-xs font-bold uppercase">
                      Critical
                    </span>
                  )}
                </div>

                <p className="text-2xl font-bold text-blue-700">
                  {strengthVal} {strengthUnit} • {quantity}
                </p>

                <p className="text-lg font-semibold text-slate-700">
                  ⏰ Scheduled: {timeSlots.map((t) => `${t.label || ''} (${t.time})`).join(', ')}
                </p>

                <p className="text-base text-slate-600">
                  🍽️ Instructions: {instructions.replace('_', ' ')}
                </p>

                <p className="text-base text-slate-600">
                  📦 Stock: {currentStock} doses (Alert at ≤{refillThreshold})
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="min-h-[56px] px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-lg flex items-center gap-2 transition"
            >
              <ChevronLeft className="w-6 h-6" />
              <span>Back</span>
            </button>
          )}

          {step < 10 ? (
            <button
              type="button"
              disabled={step === 2 && !name.trim()}
              onClick={() => setStep(step + 1)}
              className="ml-auto min-h-[64px] px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-extrabold text-xl shadow-lg flex items-center gap-2 transition disabled:opacity-50"
            >
              <span>Next Step</span>
              <ChevronRight className="w-6 h-6" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting || !name.trim()}
              onClick={handleSaveMedicine}
              className="ml-auto min-h-[68px] px-10 rounded-2xl bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white font-black text-2xl shadow-xl shadow-green-600/30 flex items-center gap-3 transition disabled:opacity-50"
            >
              <Save className="w-7 h-7" />
              <span>{submitting ? 'Saving...' : 'Confirm & Save'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

