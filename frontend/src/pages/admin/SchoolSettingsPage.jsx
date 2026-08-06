import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { ChevronDown, CheckCircle2 } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { schoolApi } from "../../api/schoolApi";

const STATE_CITY_MAP = {
  "Uttar Pradesh": [
    "Lucknow","Kanpur","Noida","Ghaziabad","Agra","Meerut","Prayagraj","Varanasi","Gorakhpur",
  ],
  Maharashtra: ["Mumbai","Pune","Nagpur","Nashik","Thane","Aurangabad","Solapur","Kolhapur"],
  Delhi: ["New Delhi","Dwarka","Rohini","Saket","Karol Bagh","Janakpuri","Pitampura"],
  Rajasthan: ["Jaipur","Udaipur","Jodhpur","Kota","Ajmer","Bikaner","Alwar"],
  Karnataka: ["Bengaluru","Mysuru","Mangalore","Hubli","Belgaum","Dharwad"],
  Gujarat: ["Ahmedabad","Surat","Vadodara","Rajkot","Bhavnagar","Jamnagar"],
  Bihar: ["Patna","Gaya","Bhagalpur","Muzaffarpur","Darbhanga"],
  Punjab: ["Chandigarh","Amritsar","Ludhiana","Jalandhar","Patiala"],
  "Tamil Nadu": ["Chennai","Coimbatore","Madurai","Tiruchirappalli","Salem","Tirunelveli"],
  Telangana: ["Hyderabad","Warangal","Nizamabad","Karimnagar","Khammam"],
  Haryana: ["Gurugram","Faridabad","Panipat","Ambala","Hisar"],
  Odisha: ["Bhubaneswar","Cuttack","Rourkela","Berhampur","Puri"],
  Kerala: ["Thiruvananthapuram","Kochi","Kozhikode","Thrissur","Kollam"],
  Assam: ["Guwahati","Dibrugarh","Jorhat","Silchar","Tezpur"],
  "Madhya Pradesh": ["Bhopal","Indore","Gwalior","Jabalpur","Ujjain","Sagar"],
  "Chhattisgarh": ["Raipur","Bhilai","Durg","Bilaspur","Korba"],
  "Uttarakhand": ["Dehradun","Haridwar","Roorkee","Nainital","Rishikesh"],
  Goa: ["Panaji","Margao","Vasco da Gama"],
  "Jharkhand": ["Ranchi","Jamshedpur","Dhanbad","Bokaro"],
  "West Bengal": ["Kolkata","Howrah","Asansol","Durgapur","Siliguri"],
  "Andhra Pradesh": ["Visakhapatnam","Vijayawada","Guntur","Nellore","Tirupati"],
  "Himachal Pradesh": ["Shimla","Dharamshala","Solan"],
  "Manipur": ["Imphal"],
  "Meghalaya": ["Shillong"],
  "Mizoram": ["Aizawl"],
  "Nagaland": ["Kohima"],
  "Sikkim": ["Gangtok"],
  "Tripura": ["Agartala"],
  "Arunachal Pradesh": ["Itanagar"],
  "Chandigarh": ["Chandigarh"],
  "Puducherry": ["Puducherry"],
  "Andaman and Nicobar Islands": ["Port Blair"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Daman","Silvassa"],
  "Lakshadweep": ["Kavaratti"],
  "Jammu and Kashmir": ["Srinagar","Jammu"],
  "Ladakh": ["Leh"],
  "Andhra Pradesh (New)": ["Amaravati"],
};

const stateOptions = Object.keys(STATE_CITY_MAP).map((state) => ({ value: state, label: state }));

const createYears = () => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: currentYear - 1899 }, (_, index) => ({
    value: String(currentYear - index),
    label: String(currentYear - index),
  }));
};

const validationSchema = z.object({
  schoolName: z
    .string()
    .trim()
    .min(3, "School name must be at least 3 characters.")
    .max(100, "School name must be at most 100 characters.")
    .regex(/^[A-Za-z0-9 ]+$/, "Only letters, numbers, and spaces are allowed."),
  tagline: z
    .string()
    .trim()
    .max(100, "Tagline must be at most 100 characters.")
    .optional()
    .refine((value) => !value || /^[A-Za-z0-9 ]+$/.test(value), {
      message: "Tagline can contain only letters, numbers, and spaces.",
    }),
  principalName: z
    .string()
    .trim()
    .min(3, "Principal name must be at least 3 characters.")
    .regex(/^[A-Za-z ]+$/, "Principal name must contain only letters and spaces."),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9][0-9]{9}$/, "Enter a valid 10-digit Indian mobile number starting with 6-9."),
  email: z.string().trim().email("Enter a valid email address."),
  website: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^(https?:\/\/|www\.)[\w\-]+(\.[\w\-]+)+([\w\-.,@?^=%&:/~+#]*[\w\-@?^=%&/~+#])?$/.test(value), {
      message: "Enter a valid URL starting with https://, http://, or www.",
    }),
  address: z.string().trim().min(10, "Address must be at least 10 characters."),
  state: z.string().min(1, "Please select a state."),
  city: z.string().min(1, "Please select a city."),
  pincode: z
    .string()
    .trim()
    .regex(/^[1-9][0-9]{5}$/, "Enter a valid 6-digit Indian PIN code."),
  establishedYear: z.string().min(1, "Please select the established year."),
  description: z.string().trim().min(20, "Description must be at least 20 characters.").max(500, "Description cannot exceed 500 characters."),
});

function SearchableDropdown({ label, value, onChange, onBlur, items, placeholder, disabled, error }) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef(null);
  const searchInputRef = useRef(null);

  const filteredItems = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return items.filter((item) => item.label.toLowerCase().includes(term));
  }, [items, searchTerm]);

  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (open && wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
        onBlur?.();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onBlur]);

  useEffect(() => {
    setActiveIndex(0);
  }, [filteredItems.length]);

  const selectedItem = items.find((item) => item.value === value);

  const handleSelect = (item) => {
    onChange(item.value);
    setOpen(false);
    setSearchTerm("");
    onBlur?.();
  };

  const handleKeyDown = (event) => {
    if (!open) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, filteredItems.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    }
    if (event.key === "Enter" && filteredItems[activeIndex]) {
      event.preventDefault();
      handleSelect(filteredItems[activeIndex]);
    }
    if (event.key === "Escape") {
      setOpen(false);
      onBlur?.();
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={`flex h-12 w-full items-center justify-between gap-3 rounded-[12px] border px-4 text-left text-sm transition-all duration-250 ease-out bg-white ${
          disabled ? "border-slate-200 bg-slate-50 text-slate-400" : error ? "border-red-400 shadow-sm ring-1 ring-red-100" : "border-slate-300 hover:border-slate-400 hover:shadow-[0_4px_15px_rgba(15,23,42,0.05)]"
        } focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`block truncate ${selectedItem ? "text-slate-900" : "text-slate-400"}`}>
          {selectedItem?.label ?? placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform duration-250 ${open ? "rotate-180" : ""}`} />
      </button>

      <div
        className={`absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-[12px] border border-slate-200 bg-white shadow-lg shadow-slate-900/10 transition-all duration-200 ease-out ${
          open ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2"
        }`}
      >
        <div className="border-b border-slate-100 px-3 py-3">
          <input
            ref={searchInputRef}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={`Search ${label}`}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <ul className="max-h-56 space-y-1 overflow-auto p-2">
          {filteredItems.length ? (
            filteredItems.map((item, index) => {
              const isActive = index === activeIndex;
              const isSelected = item.value === value;
              return (
                <li
                  key={item.value}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={-1}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`cursor-pointer rounded-xl px-3 py-2 text-sm transition-all duration-200 ${
                    isSelected ? "bg-brand-50 text-brand-700 font-semibold" : isActive ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {item.label}
                </li>
              );
            })
          ) : (
            <li className="px-3 py-3 text-sm text-slate-500">No matching options.</li>
          )}
        </ul>
      </div>
      {error && <p className="mt-2 text-sm text-red-600 opacity-90">{error.message}</p>}
    </div>
  );
}

export default function SchoolSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pincodeStatus, setPincodeStatus] = useState({ state: "idle", message: "", loading: false });
  const [detectedCity, setDetectedCity] = useState("");
  const [detectedState, setDetectedState] = useState("");

  const years = useMemo(createYears, []);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    trigger,
    formState: { errors, isValid, isSubmitting, touchedFields },
  } = useForm({
    mode: "onBlur",
    reValidateMode: "onBlur",
    resolver: zodResolver(validationSchema),
    defaultValues: {
      schoolName: "",
      tagline: "",
      principalName: "",
      phone: "",
      email: "",
      website: "",
      address: "",
      state: "",
      city: "",
      pincode: "",
      establishedYear: "",
      description: "",
    },
  });

  const stateValue = watch("state");
  const cityValue = watch("city");
  const pincodeValue = watch("pincode");

  const cityOptions = useMemo(() => {
    if (!stateValue) return [];
    const base = (STATE_CITY_MAP[stateValue] || []).map((city) => ({ value: city, label: city }));
    if (detectedCity && !base.some((city) => city.value === detectedCity)) {
      return [...base, { value: detectedCity, label: detectedCity }];
    }
    return base;
  }, [stateValue, detectedCity]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await schoolApi.get();
      reset({
        schoolName: data.schoolName ?? "",
        tagline: data.tagline ?? "",
        principalName: data.principalName ?? "",
        phone: data.phone ?? "",
        email: data.email ?? "",
        website: data.website ?? "",
        address: data.address ?? "",
        city: data.city ?? "",
        state: data.state ?? "",
        pincode: data.pincode ?? "",
        establishedYear: data.establishedYear ? String(data.establishedYear) : "",
        description: data.description ?? "",
      });
      setLoading(false);
    })();
  }, [reset]);

  useEffect(() => {
    if (!stateValue) {
      setValue("city", "");
      return;
    }
    const availableCities = STATE_CITY_MAP[stateValue] || [];
    if (cityValue && !availableCities.includes(cityValue)) {
      setValue("city", "");
    }
  }, [stateValue, cityValue, setValue]);

  useEffect(() => {
    if (!/^[1-9][0-9]{5}$/.test(pincodeValue)) {
      if (pincodeValue.length === 6) {
        setPincodeStatus({ state: "invalid", message: "Invalid PIN Code", loading: false });
      } else {
        setPincodeStatus({ state: "idle", message: "", loading: false });
      }
      return;
    }

    setPincodeStatus({ state: "loading", message: "Detecting location…", loading: true });

    const controller = new AbortController();
    const fetchLocation = async () => {
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${pincodeValue}`, {
          signal: controller.signal,
        });
        const [result] = await response.json();

        if (result?.Status !== "Success" || !result.PostOffice?.length) {
          setPincodeStatus({ state: "notfound", message: "Location not found.", loading: false });
          return;
        }

        const office = result.PostOffice[0];
        const apiState = office.State?.trim();
        const apiCity = office.District?.trim() || office.Name?.trim();
        const matchedState = stateOptions.find((option) => option.label.toLowerCase() === apiState?.toLowerCase());

        if (!matchedState) {
          setPincodeStatus({ state: "notfound", message: "Location not found.", loading: false });
          return;
        }

        const cityList = STATE_CITY_MAP[matchedState.value] || [];
        const matchedCity = cityList.find((city) => city.toLowerCase() === apiCity?.toLowerCase());
        setValue("state", matchedState.value, { shouldValidate: true, shouldDirty: true });
        setDetectedState(matchedState.value);

        if (matchedCity) {
          setValue("city", matchedCity, { shouldValidate: true, shouldDirty: true });
          setDetectedCity(matchedCity);
        } else if (apiCity) {
          setDetectedCity(apiCity);
          setValue("city", apiCity, { shouldValidate: true, shouldDirty: true });
        }

        setPincodeStatus({ state: "success", message: "Location auto-selected.", loading: false });
      } catch (error) {
        if (controller.signal.aborted) return;
        setPincodeStatus({ state: "notfound", message: "Location not found.", loading: false });
      }
    };

    const timeoutId = window.setTimeout(fetchLocation, 500);
    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [pincodeValue]);

  const submit = async (values) => {
    setSaving(true);
    try {
      const payload = {
        ...values,
        schoolName: values.schoolName.trim(),
        tagline: values.tagline?.trim() || "",
        principalName: values.principalName.trim(),
        phone: values.phone.trim(),
        email: values.email.trim(),
        website: values.website?.trim() || "",
        address: values.address.trim(),
        description: values.description.trim(),
        establishedYear: Number(values.establishedYear),
      };
      const { data } = await schoolApi.update(payload);
      reset({
        ...payload,
        establishedYear: String(data.establishedYear ?? payload.establishedYear),
      });
      toast.success("School settings updated successfully.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save school settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="School Settings" subtitle="Edit school info and branding" />
      <form
        onSubmit={handleSubmit(submit)}
        className={`max-w-3xl space-y-8 rounded-[20px] border border-slate-200 bg-white p-8 shadow-[0_25px_80px_rgba(15,23,42,0.08)] transition-all duration-300 ease-out ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">School name</label>
            <input
              {...register("schoolName")}
              onBlur={() => trigger("schoolName")}
              className={`h-12 w-full rounded-[12px] border px-4 text-sm text-slate-900 transition-all duration-250 ease-out focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none ${
                errors.schoolName ? "border-red-400" : touchedFields.schoolName ? "border-emerald-300" : "border-slate-300"
              }`}
              placeholder="Enter school name"
            />
            {errors.schoolName && <p className="mt-2 text-sm text-red-600">{errors.schoolName.message}</p>}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">Tagline</label>
            <input
              {...register("tagline")}
              onBlur={() => trigger("tagline")}
              className={`h-12 w-full rounded-[12px] border px-4 text-sm text-slate-900 transition-all duration-250 ease-out focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none ${
                errors.tagline ? "border-red-400" : touchedFields.tagline ? "border-emerald-300" : "border-slate-300"
              }`}
              placeholder="Optional tagline"
            />
            {errors.tagline && <p className="mt-2 text-sm text-red-600">{errors.tagline.message}</p>}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">Principal name</label>
            <input
              {...register("principalName")}
              onBlur={() => trigger("principalName")}
              className={`h-12 w-full rounded-[12px] border px-4 text-sm text-slate-900 transition-all duration-250 ease-out focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none ${
                errors.principalName ? "border-red-400" : touchedFields.principalName ? "border-emerald-300" : "border-slate-300"
              }`}
              placeholder="Enter principal name"
            />
            {errors.principalName && <p className="mt-2 text-sm text-red-600">{errors.principalName.message}</p>}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">Phone</label>
            <input
              {...register("phone")}
              onBlur={() => trigger("phone")}
              inputMode="numeric"
              className={`h-12 w-full rounded-[12px] border px-4 text-sm text-slate-900 transition-all duration-250 ease-out focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none ${
                errors.phone ? "border-red-400" : touchedFields.phone ? "border-emerald-300" : "border-slate-300"
              }`}
              placeholder="Enter 10-digit phone"
            />
            {errors.phone && <p className="mt-2 text-sm text-red-600">{errors.phone.message}</p>}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">Email</label>
            <input
              {...register("email")}
              onBlur={() => trigger("email")}
              type="email"
              className={`h-12 w-full rounded-[12px] border px-4 text-sm text-slate-900 transition-all duration-250 ease-out focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none ${
                errors.email ? "border-red-400" : touchedFields.email ? "border-emerald-300" : "border-slate-300"
              }`}
              placeholder="name@example.com"
            />
            {errors.email && <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-800">Website</label>
            <input
              {...register("website")}
              onBlur={() => trigger("website")}
              className={`h-12 w-full rounded-[12px] border px-4 text-sm text-slate-900 transition-all duration-250 ease-out focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none ${
                errors.website ? "border-red-400" : touchedFields.website ? "border-emerald-300" : "border-slate-300"
              }`}
              placeholder="https://www.example.com"
            />
            {errors.website && <p className="mt-2 text-sm text-red-600">{errors.website.message}</p>}
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-800">Address</label>
            <textarea
              {...register("address")}
              onBlur={() => trigger("address")}
              rows={3}
              className={`w-full rounded-[12px] border px-4 py-3 text-sm text-slate-900 transition-all duration-250 ease-out focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none ${
                errors.address ? "border-red-400" : touchedFields.address ? "border-emerald-300" : "border-slate-300"
              }`}
              placeholder="Enter your school address"
            />
            {errors.address && <p className="mt-2 text-sm text-red-600">{errors.address.message}</p>}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">State</label>
            <Controller
              name="state"
              control={control}
              render={({ field }) => (
                <SearchableDropdown
                  label="State"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  items={stateOptions}
                  placeholder="Select state"
                  error={errors.state}
                />
              )}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">City</label>
            <Controller
              name="city"
              control={control}
              render={({ field }) => (
                <SearchableDropdown
                  label="City"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  items={cityOptions}
                  placeholder={stateValue ? "Select city" : "Choose state first"}
                  disabled={!stateValue}
                  error={errors.city}
                />
              )}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">Pincode</label>
            <input
              {...register("pincode")}
              onBlur={() => trigger("pincode")}
              inputMode="numeric"
              className={`h-12 w-full rounded-[12px] border px-4 text-sm text-slate-900 transition-all duration-250 ease-out focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none ${
                errors.pincode || pincodeStatus.state === "invalid" ? "border-red-400" : touchedFields.pincode ? "border-emerald-300" : "border-slate-300"
              }`}
              placeholder="Enter 6-digit PIN"
            />
            {errors.pincode ? (
              <p className="mt-2 text-sm text-red-600">{errors.pincode.message}</p>
            ) : pincodeStatus.state !== "idle" ? (
              <p className={`mt-2 text-sm ${pincodeStatus.state === "success" ? "text-emerald-600" : "text-slate-500"}`}>
                {pincodeStatus.loading ? "Looking up location…" : pincodeStatus.message}
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">Established year</label>
            <Controller
              name="establishedYear"
              control={control}
              render={({ field }) => (
                <SearchableDropdown
                  label="Established year"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  items={years}
                  placeholder="Select year"
                  error={errors.establishedYear}
                />
              )}
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">Description</label>
          <textarea
            {...register("description")}
            onBlur={() => trigger("description")}
            rows={5}
            className={`w-full rounded-[12px] border px-4 py-4 text-sm text-slate-900 transition-all duration-250 ease-out focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none ${
              errors.description ? "border-red-400" : touchedFields.description ? "border-emerald-300" : "border-slate-300"
            }`}
            placeholder="Describe your school in at least 20 characters"
          />
          {errors.description && <p className="mt-2 text-sm text-red-600">{errors.description.message}</p>}
        </div>

        <button
          type="submit"
          disabled={!isValid || isSubmitting || saving}
          className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-[0_20px_50px_rgba(59,130,246,0.16)] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
        >
          {saving || isSubmitting ? (
            <span>Saving...</span>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" /> Save changes
            </>
          )}
        </button>
      </form>
    </div>
  );
}
