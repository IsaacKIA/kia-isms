export interface CandidateMatchInput {
  id: string;
  reference_code: string;
  full_name: string;
  gender: string;
  date_of_birth: string | null;
  age?: number | null;
  passport_available: boolean;
  passport_expiry_date: string | null;
  education_level: string;
  years_of_experience: number;
  skills: string | null;
  driving_license: boolean;
  license_class: string | null;
  preferred_countries: string | null;
  preferred_sectors: string | null;
}

export interface OpportunityMatchInput {
  id: string;
  reference_code: string;
  job_title: string;
  employer_name: string;
  country: string;
  sector: string;
  gender_requirement: string;
  minimum_age: number | null;
  maximum_age: number | null;
  minimum_height_male?: string | null;
  minimum_height_female?: string | null;
  education_requirement: string | null;
  years_experience_required: number;
  license_required: boolean;
  license_type: string | null;
  pcc_required?: boolean;
  passport_required: boolean;
}

export interface MatchEvaluationResult {
  match_score: number;
  system_decision: 'ELIGIBLE' | 'REQUIRES_REVIEW' | 'NOT_ELIGIBLE';
  legacy_eligibility_label: string;
  matched_requirements: string[];
  missing_requirements: string[];
  compliance_flags: string[];
  score_breakdown: {
    age: number;
    gender: number;
    experience: number;
    sector: number;
    country: number;
    license: number;
    education: number;
    passport: number;
  };
}

const EDUCATION_RANK: Record<string, number> = {
  none: 0,
  'basic/jhs': 1,
  'vocational/technical': 2,
  'shs/wassce': 3,
  diploma: 4,
  hnd: 5,
  "bachelor's degree": 6,
  "master's degree": 7,
  phd: 8,
};

export function calculateAge(dob: string | null, referenceDate = new Date()): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  let age = referenceDate.getFullYear() - birth.getFullYear();
  const m = referenceDate.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && referenceDate.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function getPassportStatus(
  passportAvailable: boolean,
  expiryDate: string | null,
  referenceDate = new Date()
): 'Valid' | 'Expiring Soon' | 'Expired' | 'Not Available' {
  if (!passportAvailable || !expiryDate) return 'Not Available';
  const exp = new Date(expiryDate);
  if (isNaN(exp.getTime())) return 'Not Available';
  const diffDays = (exp.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return 'Expired';
  if (diffDays < 180) return 'Expiring Soon';
  return 'Valid';
}

export function evaluateCandidateMatch(
  candidate: CandidateMatchInput,
  opportunity: OpportunityMatchInput,
  referenceDate = new Date()
): MatchEvaluationResult {
  const matched: string[] = [];
  const missing: string[] = [];
  const complianceFlags: string[] = [];

  // 1. Age Match (15 pts)
  const age = candidate.age ?? calculateAge(candidate.date_of_birth, referenceDate);
  let scoreAge = 0;
  if (age !== null) {
    const meetsMin = !opportunity.minimum_age || age >= opportunity.minimum_age;
    const meetsMax = !opportunity.maximum_age || age <= opportunity.maximum_age;
    if (meetsMin && meetsMax) {
      scoreAge = 15;
      matched.push(`Age OK (${age} yrs within ${opportunity.minimum_age ?? 'Any'}–${opportunity.maximum_age ?? 'Any'})`);
    } else {
      missing.push(`Age (${age} yrs outside ${opportunity.minimum_age ?? 'Any'}–${opportunity.maximum_age ?? 'Any'})`);
      complianceFlags.push('Age criterion triggered: verify if employer accepts experience waiver.');
    }
  } else {
    missing.push('Age (Date of Birth missing)');
  }

  // 2. Gender Match (10 pts) + Anti-Discrimination Compliance Flag
  let scoreGender = 0;
  const oppGender = (opportunity.gender_requirement || 'Any').trim();
  if (oppGender !== 'Any' && oppGender !== '') {
    complianceFlags.push(`Employer specifies gender restriction (${oppGender}) — requires BFOQ/partner compliance review.`);
  }
  if (opportunity.minimum_height_male || opportunity.minimum_height_female) {
    complianceFlags.push(
      `Employer specifies physical height requirement (${opportunity.minimum_height_male || ''} / ${opportunity.minimum_height_female || ''}) — verify physical requirement manually.`
    );
  }
  if (oppGender === 'Any' || oppGender === '' || candidate.gender.toLowerCase() === oppGender.toLowerCase()) {
    scoreGender = 10;
    matched.push('Gender OK');
  } else {
    missing.push(`Gender (${oppGender} specified by employer)`);
  }

  // 3. Experience Match (20 pts)
  let scoreExp = 0;
  const reqYears = opportunity.years_experience_required || 0;
  if ((candidate.years_of_experience || 0) >= reqYears) {
    scoreExp = 20;
    matched.push(`Experience OK (${candidate.years_of_experience} yrs >= ${reqYears} yrs)`);
  } else {
    missing.push(`Experience (${candidate.years_of_experience} yrs < ${reqYears} yrs required)`);
  }

  // 4. Sector Match (20 pts)
  let scoreSector = 0;
  const prefSectors = (candidate.preferred_sectors || '').toLowerCase();
  const oppSector = (opportunity.sector || '').toLowerCase();
  if (oppSector && prefSectors.includes(oppSector)) {
    scoreSector = 20;
    matched.push(`Sector OK (${opportunity.sector})`);
  } else {
    missing.push(`Sector Preference (${opportunity.sector})`);
  }

  // 5. Country Preference Match (10 pts)
  let scoreCountry = 0;
  const prefCountries = (candidate.preferred_countries || '').toLowerCase();
  const oppCountry = (opportunity.country || '').toLowerCase();
  if (oppCountry && prefCountries.includes(oppCountry)) {
    scoreCountry = 10;
    matched.push(`Country Pref OK (${opportunity.country})`);
  } else {
    missing.push(`Country Preference (${opportunity.country})`);
  }

  // 6. License Match (10 pts) — Structured Class & GCC check
  let scoreLicense = 0;
  let mandatoryLicenseFailed = false;
  if (!opportunity.license_required) {
    scoreLicense = 10;
    matched.push('License OK (Not Required)');
  } else {
    const reqType = (opportunity.license_type || '').toUpperCase();
    const candClass = (candidate.license_class || '').toUpperCase().trim();
    const reqClassMatch = reqType.match(/\b([A-F])\b/);
    const requiredLetter = reqClassMatch ? reqClassMatch[1] : reqType.trim();
    const hasLetter = candClass !== '' && (candClass === requiredLetter || candClass.split(/[,\s/]+/).includes(requiredLetter));
    const requiresGcc = reqType.includes('GCC');
    const candHasGcc = (candidate.skills || '').toUpperCase().includes('GCC') || candClass.includes('GCC');

    if (candidate.driving_license && hasLetter) {
      scoreLicense = 10;
      if (requiresGcc && !candHasGcc) {
        matched.push(`License Class ${candClass} OK (Verify GCC License)`);
        complianceFlags.push(`Opportunity requires ${opportunity.license_type}; candidate has Ghana Class ${candClass} — verify GCC exchange/endorsement.`);
      } else {
        matched.push(`License OK (Class ${candClass})`);
      }
    } else {
      mandatoryLicenseFailed = true;
      missing.push(`Mandatory License (${opportunity.license_type || 'Required'})`);
    }
  }

  // 7. Education Match (10 pts) — Ordinal Rank Hierarchy (Fixes Excel exact-string bug!)
  let scoreEducation = 0;
  const oppEdu = (opportunity.education_requirement || '').trim().toLowerCase();
  const candEdu = (candidate.education_level || '').trim().toLowerCase();
  if (!oppEdu || oppEdu === 'none') {
    scoreEducation = 10;
    matched.push('Education OK');
  } else {
    const oppRank = EDUCATION_RANK[oppEdu] ?? 1;
    const candRank = EDUCATION_RANK[candEdu] ?? 0;
    if (candRank >= oppRank) {
      scoreEducation = 10;
      matched.push(`Education OK (${candidate.education_level} meets ${opportunity.education_requirement})`);
    } else {
      missing.push(`Education (${candidate.education_level} below ${opportunity.education_requirement})`);
    }
  }

  // 8. Passport Readiness (5 pts) — Checks actual validity/expiry (Fixes Excel expired passport bug!)
  let scorePassport = 0;
  let mandatoryPassportMissing = false;
  let passportExpiredOrExpiring = false;
  const passportStatus = getPassportStatus(candidate.passport_available, candidate.passport_expiry_date, referenceDate);

  if (passportStatus === 'Valid') {
    scorePassport = 5;
    matched.push('Passport Ready (Valid)');
  } else if (passportStatus === 'Expiring Soon') {
    scorePassport = 5;
    passportExpiredOrExpiring = true;
    matched.push('Passport Available (Expiring < 6 months)');
    complianceFlags.push(`Passport expires on ${candidate.passport_expiry_date} (<180 days) — renewal required before visa submission.`);
  } else if (passportStatus === 'Expired') {
    scorePassport = 0;
    passportExpiredOrExpiring = true;
    missing.push(`Passport Expired (${candidate.passport_expiry_date})`);
    complianceFlags.push(`Candidate holds expired passport (${candidate.passport_expiry_date}) — must renew before visa processing.`);
  } else {
    if (opportunity.passport_required) {
      mandatoryPassportMissing = true;
    }
    missing.push('Passport Not Available');
  }

  const totalScore =
    scoreAge +
    scoreGender +
    scoreExp +
    scoreSector +
    scoreCountry +
    scoreLicense +
    scoreEducation +
    scorePassport;

  let legacyLabel = 'NOT RECOMMENDED';
  if (mandatoryLicenseFailed) {
    legacyLabel = 'NOT ELIGIBLE (License)';
  } else if (mandatoryPassportMissing) {
    legacyLabel = 'NOT ELIGIBLE (Passport)';
  } else if (totalScore >= 90) {
    legacyLabel = 'EXCELLENT MATCH';
  } else if (totalScore >= 80) {
    legacyLabel = 'STRONG MATCH';
  } else if (totalScore >= 70) {
    legacyLabel = 'POSSIBLE MATCH';
  } else if (totalScore >= 60) {
    legacyLabel = 'LOW MATCH';
  }

  let systemDecision: 'ELIGIBLE' | 'REQUIRES_REVIEW' | 'NOT_ELIGIBLE' = 'ELIGIBLE';
  if (mandatoryLicenseFailed || mandatoryPassportMissing || totalScore < 60) {
    systemDecision = 'NOT_ELIGIBLE';
  } else if (passportExpiredOrExpiring || totalScore < 80 || complianceFlags.length > 0) {
    systemDecision = 'REQUIRES_REVIEW';
  }

  return {
    match_score: totalScore,
    system_decision: systemDecision,
    legacy_eligibility_label: legacyLabel,
    matched_requirements: matched,
    missing_requirements: missing,
    compliance_flags: complianceFlags,
    score_breakdown: {
      age: scoreAge,
      gender: scoreGender,
      experience: scoreExp,
      sector: scoreSector,
      country: scoreCountry,
      license: scoreLicense,
      education: scoreEducation,
      passport: scorePassport,
    },
  };
}
