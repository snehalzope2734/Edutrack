import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { ChevronDown, Send } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import { adminApi } from "../../api/adminApi";
import { notificationApi } from "../../api/notificationApi";

const titleSchema = z
  .string()
  .trim()
  .min(5, "Title must be at least 5 characters.")
  .max(100, "Title must be at most 100 characters.")
  .refine((value) => /[A-Za-z]/.test(value), {
    message: "Title must contain letters and cannot be numbers only.",
  });

const messageSchema = z
  .string()
  .trim()
  .min(10, "Message must be at least 10 characters.")
  .max(500, "Message must be at most 500 characters.")
  .refine((value) => /[A-Za-z]/.test(value), {
    message: "Message must contain letters and cannot be numbers only.",
  });

const notificationSchema = z
  .object({
    title: titleSchema,
    message: messageSchema,
    type: z.string().min(1, "Please select a notification type."),
    scope: z.string().min(1, "Please select a recipient."),
    classId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.scope === "CLASS" && !data.classId) {
      ctx.addIssue({
        path: ["classId"],
        code: z.ZodIssueCode.custom,
        message: "Please select a class.",
      });
    }
  });

function CustomSelect({ label, value, onChange, onBlur, placeholder, items, error }) {
  const [open, setOpen] = useState(false);
  const selectRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (open && selectRef.current && !selectRef.current.contains(event.target)) {
        setOpen(false);
        onBlur?.();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onBlur]);

  const selectedOption = items.find((item) => item.value === value);

  return (
    <div className="relative" ref={selectRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        onBlur={() => {
          if (!open) onBlur?.();
        }}
        className={`flex h-12 w-full items-center justify-between gap-3 rounded-[12px] border px-4 text-left text-sm transition-all duration-250 ease-[ease] shadow-sm ${
          error
            ? "border-red-400 bg-white ring-1 ring-red-100"
            : "border-slate-300 bg-white hover:border-brand-500 hover:shadow-[0_10px_30px_rgba(15,23,42,0.05)]"
        } focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`block truncate text-sm ${selectedOption ? "text-slate-900" : "text-slate-400"}`}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform duration-250 ${open ? "rotate-180" : ""}`} />
      </button>

      <div
        className={`pointer-events-none absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-[12px] border border-slate-200 bg-white shadow-lg shadow-slate-900/5 transition-all duration-200 ease-out ${
          open ? "pointer-events-auto opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        <ul className="max-h-60 overflow-auto py-2">
          {items.map((item) => {
            const isSelected = item.value === value;
            return (
              <li
                key={item.value}
                role="option"
                aria-selected={isSelected}
                tabIndex={0}
                onClick={() => {
                  onChange(item.value);
                  setOpen(false);
                  onBlur?.();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onChange(item.value);
                    setOpen(false);
                    onBlur?.();
                  }
                }}
                className={`cursor-pointer px-4 py-3 text-sm transition-colors duration-200 ${
                  isSelected ? "bg-brand-50 text-brand-700 font-semibold" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </li>
            );
          })}
        </ul>
      </div>

      {error && <p className="mt-1 text-xs text-red-600">{error.message}</p>}
    </div>
  );
}

export default function NotificationsComposePage() {
  const [classes, setClasses] = useState([]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors, isValid, isSubmitting },
  } = useForm({
    mode: "onBlur",
    reValidateMode: "onBlur",
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      title: "",
      message: "",
      type: "notice",
      scope: "ALL",
      classId: "",
    },
  });

  const scope = watch("scope");

  useEffect(() => {
    (async () => {
      try {
        const { data: classData } = await adminApi.listClasses();
        setClasses(classData ?? []);
      } catch {
        toast.error("Could not load recipients for notifications.");
      }
    })();
  }, []);

  const onSubmit = async (values) => {
    const recipients = values.scope === "CLASS"
      ? [`CLASS:${values.classId}`]
      : values.scope === "TEACHER"
      ? ["ALL_TEACHERS"]
      : ["ALL"];

    try {
      await notificationApi.create({
        title: values.title.trim(),
        message: values.message.trim(),
        type: values.type,
        recipients,
        classId: values.scope === "CLASS" ? values.classId : null,
      });
      toast.success("Notification sent");
      setValue("title", "");
      setValue("message", "");
      setValue("type", "notice");
      setValue("scope", "ALL");
      setValue("classId", "");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not send notification");
    }
  };

  return (
    <div>
      <PageHeader title="Send Notification" subtitle="Push an alert/reminder to everyone or a class" />
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/50">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Title</label>
          <input
            {...register("title")}
            onBlur={() => trigger("title")}
            className={`w-full rounded-2xl border px-4 py-3 text-sm shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 ${errors.title ? "border-red-400 ring-red-100" : "border-slate-300"}`}
            placeholder="Enter a short notification title"
          />
          {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Message</label>
          <textarea
            {...register("message")}
            rows={5}
            onBlur={() => trigger("message")}
            className={`w-full rounded-2xl border px-4 py-3 text-sm shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 ${errors.message ? "border-red-400 ring-red-100" : "border-slate-300"}`}
            placeholder="Write the notification details here"
          />
          {errors.message && <p className="mt-1 text-xs text-red-600">{errors.message.message}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Type</label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <CustomSelect
                  label="Type"
                  value={field.value}
                  onChange={(value) => field.onChange(value)}
                  onBlur={field.onBlur}
                  placeholder="Select type"
                  items={[
                    { value: "notice", label: "Notice" },
                    { value: "alert", label: "Alert" },
                    { value: "reminder", label: "Reminder" },
                    { value: "update", label: "Update" },
                  ]}
                  error={errors.type}
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Send to</label>
            <Controller
              name="scope"
              control={control}
              render={({ field }) => (
                <CustomSelect
                  label="Send to"
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value);
                    if (value !== "CLASS") setValue("classId", "");
                  }}
                  onBlur={field.onBlur}
                  placeholder="Select recipient"
                  items={[
                    { value: "ALL", label: "Everyone" },
                    { value: "CLASS", label: "Class" },
                    { value: "TEACHER", label: "Teachers" },
                  ]}
                  error={errors.scope}
                />
              )}
            />
          </div>
        </div>

        {scope === "CLASS" && (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Class</label>
            <Controller
              name="classId"
              control={control}
              render={({ field }) => (
                <CustomSelect
                  label="Class"
                  value={field.value}
                  onChange={(value) => field.onChange(value)}
                  onBlur={field.onBlur}
                  placeholder="Select a class"
                  items={classes.map((c) => ({ value: c.id, label: `${c.className}${c.section ? ` ${c.section}` : ""}` }))}
                  error={errors.classId}
                />
              )}
            />
          </div>
        )}

        {scope === "TEACHER" && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            This notification will be sent to all teachers.
          </div>
        )}

        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Send className="h-4 w-4" /> {isSubmitting ? "Sending…" : "Send notification"}
        </button>
      </form>
    </div>
  );
}
