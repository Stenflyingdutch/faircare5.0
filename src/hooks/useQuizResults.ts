import { useEffect } from 'react';
import { getIndividualResultsByUser, getSharedResultsByHousehold } from '@/services/firebase/resultService';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';
import { useResultsStore } from '@/store/resultsStore';

export const useQuizResults = () => {
  const user = useAuthStore((s) => s.authUser);
  const profile = useProfileStore((s) => s.profile);
  const { individualResult, sharedResult, setIndividualResult, setSharedResult } = useResultsStore();

  useEffect(() => {
    if (!user?.uid) return;
    getIndividualResultsByUser(user.uid).then((items) => setIndividualResult(items[0] || null));
  }, [user?.uid, setIndividualResult]);

  useEffect(() => {
    if (!profile?.householdId) return;
    getSharedResultsByHousehold(profile.householdId).then((items) => setSharedResult(items[0] || null));
  }, [profile?.householdId, setSharedResult]);

  return { individualResult, sharedResult };
};
