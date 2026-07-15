# Handoff Report: Rebranding OmniCare to BruvoLabs in Login/Auth Views

## 1. Observation
From a codebase-wide case-insensitive search for the term `"omnicare"`, we located the following direct references within the login/auth views and related layout/metadata files:

### A. Core Login/Auth Views
1. **`super_admin_web/src/app/(auth)/login/page.tsx`**
   - **Line 46**: Displays the heading text `"OmniCare Platform"`.
   ```tsx
   45:             <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
   46:               OmniCare Platform
   47:             </h2>
   ```

2. **`clinic-dashboard/app/page.js`**
   - **Line 114**: Displays the heading text `"OmniCare Clinic"`.
   ```javascript
   113: 
   114:         <h1 className={styles.title}>OmniCare Clinic</h1>
   115:         <p className={styles.subtitle}>
   ```

### B. Related Authentication Panel Layouts (Metadata, Titles)
1. **`super_admin_web/src/app/layout.tsx`**
   - **Lines 17-18**: Sets the browser page title metadata and description.
   ```typescript
   16: export const metadata: Metadata = {
   17:   title: "OmniCare AI | Super Admin",
   18:   description: "Super Admin Dashboard for OmniCare AI",
   19: };
   ```

2. **`clinic-dashboard/app/layout.js`**
   - **Line 5**: Sets the browser page title metadata.
   ```javascript
   4: export const metadata = {
   5:   title: 'OmniCare Clinic',
   6:   description: 'Clinic Management Dashboard',
   7: };
   ```

### C. Other User-Facing Pages & Database/App References
*While not strictly part of the login/auth views, the following files also contain "OmniCare" references:*
- **`clinic-dashboard/app/display/page.js`** (Line 98: fallback title `{clinic?.clinic_name || 'OmniCare Clinic'}`)
- **`super_admin_web/src/app/(dashboard)/clinics/page.tsx`** (Line 194: `placeholder="OmniCare Central"`, Line 198: `placeholder="contact@omnicare.com"`)
- **`super_admin_web/src/app/(dashboard)/page.tsx`** (Line 156: `"The average clinic using OmniCare sees..."`)
- **`super_admin_web/src/components/layout/Header.tsx`** (Line 58: `"OmniCare Central..."`)
- **`super_admin_web/src/components/layout/Sidebar.tsx`** (Line 30: `"OmniCare Admin"`, Line 67: `"admin@omnicare.ai"`)
- **`supabase/migrations/20260101000017_master_wallet_alerts.sql`** (Lines 27 and 43: SQL triggers sending alerts containing `"OMNICARE CRITICAL ALERT"`)
- **`frontend/pubspec.yaml`** & flutter codebase (contains name `omnicare_ai`, references to `'OmniCare'` theme and router files)

---

## 2. Logic Chain
1. **Page Headings**: The heading elements on the login pages (`super_admin_web/src/app/(auth)/login/page.tsx` line 46 and `clinic-dashboard/app/page.js` line 114) directly render the brand name `"OmniCare"` to users attempting to authenticate. Changing these strings to `"BruvoLabs"` is necessary to update the user-facing branding.
2. **Metadata & Browser Titles**: Next.js root layout files (`super_admin_web/src/app/layout.tsx` and `clinic-dashboard/app/layout.js`) define the `metadata` object, which is used to populate the `<title>` and `<meta name="description">` tags. Because these root layouts wrap the entire application (including the login routes), the browser tab title displays `"OmniCare AI | Super Admin"` and `"OmniCare Clinic"`. Updating these layout fields to `"BruvoLabs AI | Super Admin"` and `"BruvoLabs Clinic"` ensures the browser tabs reflect the new branding.
3. **No External Logos**: Inspection of the logo structures on the login pages showed that both apps use standard vectors/icons (`Bot` lucide-react component in `super_admin_web` and an inline SVG monitor path in `clinic-dashboard`) rather than external image files. Therefore, no logo image assets need replacement.
4. **Conclusion**: Modifying the identified four files (listed below in the proposed changes) is the complete set of steps required to successfully rebrand the authentication interfaces.

---

## 3. Caveats
- We did not alter or propose changes to the domain slugs or placeholder email domains containing `"queuecare"` (e.g. `admin1@queuecare.local` or `@queuecare.com` in `clinic-dashboard/app/page.js`). We assume these domain names are part of the core product routing infrastructure and are separate from the external brand name renaming of `"OmniCare"` to `"BruvoLabs"`.
- This investigation is read-only and does not implement the changes directly.
- References in the mobile Flutter app, database migration logs, and system documentation (`docs/`) were noted but are not included in the primary authentication panel patch.

---

## 4. Conclusion
To successfully rebrand the login/authentication panels to **BruvoLabs**, the following specific changes should be made to the codebase. A patch file containing these exact changes has been generated and saved to:
`c:\Users\HOME\OneDrive\Attachments\ai agent\.agents\explorer_telecmi_m1_2\branding_changes.patch`

### Proposed Changes Summary:

#### 1. `super_admin_web/src/app/(auth)/login/page.tsx`
*Change heading from "OmniCare Platform" to "BruvoLabs Platform".*
* **Before (Line 46)**:
  ```tsx
  <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
    OmniCare Platform
  </h2>
  ```
* **After**:
  ```tsx
  <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
    BruvoLabs Platform
  </h2>
  ```

#### 2. `clinic-dashboard/app/page.js`
*Change heading from "OmniCare Clinic" to "BruvoLabs Clinic".*
* **Before (Line 114)**:
  ```javascript
  <h1 className={styles.title}>OmniCare Clinic</h1>
  ```
* **After**:
  ```javascript
  <h1 className={styles.title}>BruvoLabs Clinic</h1>
  ```

#### 3. `clinic-dashboard/app/layout.js`
*Change metadata title from "OmniCare Clinic" to "BruvoLabs Clinic".*
* **Before (Line 5)**:
  ```javascript
  export const metadata = {
    title: 'OmniCare Clinic',
    description: 'Clinic Management Dashboard',
  };
  ```
* **After**:
  ```javascript
  export const metadata = {
    title: 'BruvoLabs Clinic',
    description: 'Clinic Management Dashboard',
  };
  ```

#### 4. `super_admin_web/src/app/layout.tsx`
*Change metadata title and description to BruvoLabs.*
* **Before (Lines 17-18)**:
  ```typescript
  export const metadata: Metadata = {
    title: "OmniCare AI | Super Admin",
    description: "Super Admin Dashboard for OmniCare AI",
  };
  ```
* **After**:
  ```typescript
  export const metadata: Metadata = {
    title: "BruvoLabs AI | Super Admin",
    description: "Super Admin Dashboard for BruvoLabs AI",
  };
  ```

---

## 5. Verification Method
To independently verify the changes, the next-in-line agent (implementer) should:
1. Apply the patch file:
   ```bash
   git apply .agents/explorer_telecmi_m1_2/branding_changes.patch
   ```
2. Run build checks for both projects to ensure there are no compilation errors:
   - In `/super_admin_web`: `npm run build`
   - In `/clinic-dashboard`: `npm run build`
3. Run the development servers (`npm run dev`) and open the login pages in a browser.
4. Verify that:
   - The browser tab titles display **"BruvoLabs AI | Super Admin"** and **"BruvoLabs Clinic"** respectively.
   - The text headers on the screens display **"BruvoLabs Platform"** and **"BruvoLabs Clinic"** respectively.
   - No visual assets or styles are broken.
