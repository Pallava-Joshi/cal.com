import type { ReactNode } from "react";

import type { ScheduleLabelsType } from "@calcom/features/schedules/components/Schedule";
import type {
  ApiErrorResponse,
  ApiResponse,
  ScheduleOutput_2024_06_11,
  UpdateScheduleInput_2024_06_11,
} from "@calcom/platform-types";

import useDeleteSchedule from "../../hooks/schedules/useDeleteSchedule";
import { useSchedule } from "../../hooks/schedules/useSchedule";
import { useSchedules } from "../../hooks/schedules/useSchedules";
import useUpdateSchedule from "../../hooks/schedules/useUpdateSchedule";
import { useMe } from "../../hooks/useMe";
import { AtomsWrapper } from "../../src/components/atoms-wrapper";
import { useToast } from "../../src/components/ui/use-toast";
import type { Availability } from "../AvailabilitySettings";
import type { CustomClassNames } from "../AvailabilitySettings";
import { AvailabilitySettings } from "../AvailabilitySettings";
import { transformApiScheduleForAtom } from "../atom-api-transformers/transformApiScheduleForAtom";
import { transformAtomScheduleForApi } from "../atom-api-transformers/transformAtomScheduleForApi";
import type { AvailabilityFormValues } from "../types";

type AvailabilitySettingsPlatformWrapperProps = {
  id?: string;
  labels?: {
    tooltips: Partial<ScheduleLabelsType>;
  };
  customClassNames?: Partial<CustomClassNames>;
  onUpdateSuccess?: (res: ApiResponse<ScheduleOutput_2024_06_11>) => void;
  onUpdateError?: (err: ApiErrorResponse) => void;
  onDeleteSuccess?: (res: ApiResponse) => void;
  onDeleteError?: (err: ApiErrorResponse) => void;
  disableEditableHeading?: boolean;
  enableOverrides?: boolean;
  onBeforeUpdate?: (updateBody: UpdateScheduleInput_2024_06_11) => boolean | Promise<boolean>;
  onFormStateChange?: (formState: AvailabilityFormValues) => void;
  allowDelete?: boolean;
  allowSetToDefault?: boolean;
  disableToasts?: boolean;
  isDryRun?: boolean;
  noScheduleChildren?: ReactNode;
  loadingStateChildren?: ReactNode;
};

export const AvailabilitySettingsPlatformWrapper = ({
  id,
  customClassNames,
  onDeleteError,
  onDeleteSuccess,
  onUpdateError,
  onUpdateSuccess,
  disableEditableHeading = false,
  enableOverrides = false,
  onBeforeUpdate,
  onFormStateChange,
  allowDelete,
  allowSetToDefault,
  disableToasts,
  isDryRun = false,
  noScheduleChildren,
  loadingStateChildren,
}: AvailabilitySettingsPlatformWrapperProps) => {
  const { isLoading, data: schedule } = useSchedule(id);
  const { data: schedules } = useSchedules();
  const { data: me } = useMe();
  const atomSchedule = transformApiScheduleForAtom(me?.data, schedule, schedules?.length || 0);
  const { timeFormat } = me?.data || { timeFormat: null };
  const { toast } = useToast();

  const { mutate: deleteSchedule, isPending: isDeletionInProgress } = useDeleteSchedule({
    onSuccess: (res) => {
      onDeleteSuccess?.(res);
      if (!disableToasts) {
        toast({
          description: "Schedule deleted successfully",
        });
      }
    },
    onError: (err) => {
      onDeleteError?.(err);
      if (!disableToasts) {
        toast({
          description: "Could not delete schedule",
        });
      }
    },
  });

  const { mutate: updateSchedule, isPending: isSavingInProgress } = useUpdateSchedule({
    onSuccess: (res) => {
      onUpdateSuccess?.(res);
      if (!disableToasts) {
        toast({
          description: "Schedule updated successfully",
        });
      }
    },
    onError: (err) => {
      onUpdateError?.(err);
      if (!disableToasts) {
        toast({
          description: "Could not update schedule",
        });
      }
    },
  });

  const handleDelete = async (id: number) => {
    await deleteSchedule({ id });
  };

  const handleUpdate = async (id: number, body: AvailabilityFormValues) => {
    const updateBody = transformAtomScheduleForApi(body);

    let canUpdate = true;

    if (onBeforeUpdate) {
      canUpdate = await onBeforeUpdate(updateBody);
    }

    if (canUpdate) {
      updateSchedule({ id, ...updateBody });
    }
  };

  if (isLoading) {
    return (
      <>
        {loadingStateChildren ? loadingStateChildren : <div className="px-10 py-4 text-xl">Loading...</div>}
      </>
    );
  }

  if (!atomSchedule) {
    return noScheduleChildren ? (
      <>{noScheduleChildren}</>
    ) : (
      <div className="px-10 py-4 text-xl">No user schedule present</div>
    );
  }

  return (
    <AtomsWrapper>
      <AvailabilitySettings
        disableEditableHeading={disableEditableHeading}
        handleDelete={() => {
          if (isDryRun) {
            toast({
              description: "Schedule deleted successfully",
            });
          }

          if (!isDryRun && atomSchedule.id) {
            handleDelete(atomSchedule.id);
          }
        }}
        handleSubmit={async (data) => {
          if (isDryRun) {
            toast({
              description: "Schedule updated successfully",
            });
          }

          if (!isDryRun && atomSchedule.id) {
            handleUpdate(atomSchedule.id, data);
          }
        }}
        weekStart={me?.data?.weekStart || "Sunday"}
        timeFormat={timeFormat}
        enableOverrides={enableOverrides}
        isLoading={isLoading}
        schedule={{
          name: atomSchedule.name,
          id: atomSchedule.id,
          isLastSchedule: atomSchedule.isLastSchedule,
          isDefault: atomSchedule.isDefault,
          workingHours: atomSchedule.workingHours,
          dateOverrides: atomSchedule.dateOverrides,
          timeZone: atomSchedule.timeZone,
          availability: atomSchedule.availability,
          schedule:
            atomSchedule.schedule.reduce(
              (acc: Availability[], avail: Availability) => [
                ...acc,
                { days: avail.days, startTime: new Date(avail.startTime), endTime: new Date(avail.endTime) },
              ],
              []
            ) || [],
        }}
        isDeleting={isDeletionInProgress}
        isSaving={isSavingInProgress}
        backPath=""
        isPlatform={true}
        customClassNames={customClassNames}
        allowDelete={allowDelete}
        allowSetToDefault={allowSetToDefault}
        onFormStateChange={onFormStateChange}
      />
    </AtomsWrapper>
  );
};
