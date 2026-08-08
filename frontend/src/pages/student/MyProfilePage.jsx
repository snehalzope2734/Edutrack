import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { userApi } from "../../api/userApi";
import { studentApi } from "../../api/studentApi";
import { User, Phone, Mail, Home, Users, Calendar, Award } from "lucide-react";
import { format } from "date-fns";

export default function MyProfilePage() {
  const [user, setUser] = useState(null);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const [userRes, meRes] = await Promise.all([
          userApi.me().catch(() => ({ data: {} })),
          studentApi.me().catch(() => ({ data: {} }))
        ]);
        setUser(userRes.data || {});
        setMe(meRes.data || {});
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingSpinner label="Loading student profile..." />;

  const merged = { ...(user || {}), ...(me || {}) };

  const formatDate = (d) => {
    if (!d) return "—";
    try {
      const dt = typeof d === "string" ? new Date(d) : d;
      return isNaN(dt.getTime()) ? "—" : format(dt, "dd MMM yyyy");
    } catch {
      return "—";
    }
  };

  const firstName = merged.name || merged.fullName || merged.full_name || "Student";
  const rollNumber = merged.rollNumber || merged.roll_number || "—";
  const className = merged.className || merged.class_name || merged.class || "—";
  const section = merged.section || "";
  const gender = merged.gender || merged.sex || "—";
  const dob = merged.dateOfBirth || merged.date_of_birth || merged.dob || null;
  const bloodGroup = merged.bloodGroup || merged.blood_group || merged.bloodType || "—";

  const email = merged.email || "—";
  const phone = merged.phone || "—";
  const address = merged.address || merged.addr || merged.permanentAddress || "—";

  const parentName = merged.parentName || merged.guardianName || merged.parent_name || "—";
  const parentRelationship = merged.parentRelationship || merged.relationship || merged.guardianRelationship || "Parent/Guardian";
  const parentEmail = merged.parentEmail || merged.parent_email || "—";
  const parentPhone = merged.parentPhone || merged.parent_phone || merged.guardianPhone || "—";

  const academicYear = merged.academicYear || merged.academic_year || "—";
  const admissionNumber = merged.admissionNumber || merged.admission_no || merged.admissionDate || "—";
  const role = merged.role || "Student";

  const profilePhoto = merged.profilePhotoUrl || merged.profile_photo_url || merged.profilePhoto || null;
  const initials = (firstName || "").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase() || "ST";

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="My Profile"
        subtitle="Review your personal and academic student details. Request changes if any information needs updating."
      />

      <div className="max-w-6xl">
        <div className="rounded-[2rem] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm transition-colors overflow-hidden">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800 p-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Student Profile</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Complete personal and academic details</p>
            </div>
            <div>
              <button
                onClick={() => navigate("/student/profile/change-request")}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 dark:bg-brand-500 px-4 py-2.5 text-xs font-semibold text-white hover:bg-brand-700 dark:hover:bg-brand-600 shadow-md transition-all"
              >
                Request Profile Change
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Personal + Contact */}
              <div className="space-y-6">
                <div className="flex items-center gap-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
                  <div className="h-20 w-20 flex-shrink-0 rounded-2xl overflow-hidden bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-300 flex items-center justify-center font-bold text-xl shadow-inner">
                    {profilePhoto ? (
                      <img src={profilePhoto} alt="Profile photo" className="h-full w-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Full Name</div>
                    <div className="mt-0.5 text-lg font-bold text-slate-900 dark:text-slate-100">{firstName}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                        {role}
                      </span>
                      {className !== "—" && (
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Class {className} {section ? `(${section})` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <section className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-slate-900 shadow-sm space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <User className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Personal Information</h3>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Roll Number</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{rollNumber}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Class & Section</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{className}{section ? ` • ${section}` : ""}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Gender</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{gender}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Date of Birth</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{formatDate(dob)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Blood Group</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{bloodGroup}</span>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-slate-900 shadow-sm space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <Mail className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Contact Information</h3>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Email Address</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{email}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Phone Number</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{phone}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Residential Address</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 text-right max-w-[60%]">{address}</span>
                    </div>
                  </div>
                </section>
              </div>

              {/* Right Column: Parent + Academic */}
              <div className="space-y-6">
                <section className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-slate-900 shadow-sm space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <Users className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Parent / Guardian Details</h3>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Parent Name</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{parentName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Relationship</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{parentRelationship}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Parent Email</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{parentEmail}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Parent Phone</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{parentPhone}</span>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-slate-900 shadow-sm space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <Award className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Academic Information</h3>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Academic Year</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{academicYear}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Admission Date</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{formatDate(admissionNumber)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Account Role</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{role}</span>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
