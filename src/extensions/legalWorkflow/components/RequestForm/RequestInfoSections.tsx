import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import { Separator } from '@fluentui/react/lib/Separator';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { SelectBox } from 'devextreme-react/select-box';
import { Controller, FieldErrors, useFormContext } from 'react-hook-form';

import { FormContainer, FormItem, FormLabel, FormValue } from 'spfx-toolkit/lib/components/spForm';
import {
  SPChoiceField,
  SPChoiceDisplayType,
  SPDateField,
  SPDateTimeFormat,
  SPTextField,
  SPTextFieldMode,
  SPUserField,
} from 'spfx-toolkit/lib/components/spFields';

import { Lists } from '@sp/Lists';

import type { ILegalRequest } from '@appTypes/index';
import {
  Audience,
  DistributionMethod,
  FINRAAudienceCategory,
  RequestType,
  SeparateAcctStrategies,
  SeparateAcctStrategiesIncl,
  SubmissionType,
  UCITS,
  USFunds,
  USFundShares,
} from '@appTypes/index';
import { PriorSubmissionPicker } from '@components/PriorSubmissionPicker/PriorSubmissionPicker';
import { ReviewAudienceSelector } from '@components/ReviewAudienceSelector';
import { useSubmissionItems } from '@stores/submissionItemsStore';
import {
  TITLE_MAX_LENGTH,
  PURPOSE_MAX_LENGTH,
  RUSH_RATIONALE_MAX_LENGTH,
  FIELD_LIMIT_MESSAGES,
} from '@constants/fieldLimits';

const SECTION_HEADER_TOKENS = { childrenGap: 4 };
const SECTION_HEADER_INNER_TOKENS = { childrenGap: 12 };
const SECTION_ICON_STYLES = { root: { fontSize: '20px', color: '#0078d4' } };
const SECTION_TITLE_STYLES = { root: { fontWeight: 600 as const, color: '#323130' } };
const SECTION_DESC_STYLES = { root: { color: '#605e5c' } };

const SUBMISSION_TYPE_CHOICES: SubmissionType[] = [
  SubmissionType.New,
  SubmissionType.MaterialUpdates,
];

// Note: Review audience choices are now handled by the ReviewAudienceSelector component
// which has its own internal configuration for the card-based selection

const DISTRIBUTION_METHOD_CHOICES: DistributionMethod[] = [
  DistributionMethod.DodgeCoxWebsiteUS,
  DistributionMethod.DodgeCoxWebsiteNonUS,
  DistributionMethod.ThirdPartyWebsite,
  DistributionMethod.EmailMail,
  DistributionMethod.MobileApp,
  DistributionMethod.DisplayCardSignage,
  DistributionMethod.Hangout,
  DistributionMethod.LiveTalkingPoints,
  DistributionMethod.SocialMedia,
];

const FINRA_AUDIENCE_CATEGORY_CHOICES: FINRAAudienceCategory[] = [
  FINRAAudienceCategory.Institutional,
  FINRAAudienceCategory.RetailPublic,
];

const AUDIENCE_CHOICES: Audience[] = [
  Audience.ProspectiveSeparateAcctClient,
  Audience.ExistingSeparateAcctClient,
  Audience.ProspectiveFundShareholder,
  Audience.ExistingFundShareholder,
  Audience.Consultant,
  Audience.Other,
];

const US_FUNDS_CHOICES: USFunds[] = [
  USFunds.AllFunds,
  USFunds.BalancedFund,
  USFunds.EMStockFund,
  USFunds.GlobalStockFund,
  USFunds.IncomeFund,
  USFunds.InternationalStockFund,
  USFunds.StockFund,
  USFunds.GlobalBondFund,
];

const US_FUND_SHARES_CHOICES: USFundShares[] = [USFundShares.IShares, USFundShares.XShares];

const UCITS_CHOICES: UCITS[] = [
  UCITS.AllUCITSFunds,
  UCITS.EMStockFund,
  UCITS.GlobalBondFund,
  UCITS.GlobalStockFund,
  UCITS.USStockFund,
];

const SEPARATE_ACCT_STRATEGIES_CHOICES: SeparateAcctStrategies[] = [
  SeparateAcctStrategies.AllSeparateAccountStrategies,
  SeparateAcctStrategies.Equity,
  SeparateAcctStrategies.FixedIncome,
  SeparateAcctStrategies.Balanced,
];

const SEPARATE_ACCT_STRATEGIES_INCL_CHOICES: SeparateAcctStrategiesIncl[] = [
  SeparateAcctStrategiesIncl.ClientRelatedDataOnly,
  SeparateAcctStrategiesIncl.RepresentativeAccount,
  SeparateAcctStrategiesIncl.CompositeData,
];

interface SectionHeaderProps {
  icon: string;
  title: string;
  description: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ icon, title, description }) => (
  <Stack tokens={SECTION_HEADER_TOKENS}>
    <Stack horizontal verticalAlign='center' tokens={SECTION_HEADER_INNER_TOKENS}>
      <Icon iconName={icon} styles={SECTION_ICON_STYLES} />
      <Text variant='xLarge' styles={SECTION_TITLE_STYLES}>
        {title}
      </Text>
    </Stack>
    <Text variant='small' styles={SECTION_DESC_STYLES}>
      {description}
    </Text>
  </Stack>
);

interface BasicInfoSectionProps {
  errors: FieldErrors<ILegalRequest>;
  hasSubmissionItemSelection: boolean;
  calculatedIsRush: boolean;
}

export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  errors,
  hasSubmissionItemSelection,
  calculatedIsRush,
}) => {
  const { control, setValue, clearErrors } = useFormContext<ILegalRequest>();
  const requestListIdentifier = Lists.Requests.Title; //React.useMemo(() => getRequestListIdentifier(), []);
  const {
    items: submissionItems,
    isLoading: isLoadingSubmissionItems,
    error: submissionItemsError,
  } = useSubmissionItems();

  // Track if "Other" is selected
  const [isOtherSelected, setIsOtherSelected] = React.useState(false);

  /**
   * Handle submission item change - clear submissionItemOther when non-Other is selected
   */
  const handleSubmissionItemChange = React.useCallback(
    (selectedValue: string, fieldOnChange: (value: string) => void) => {
      fieldOnChange(selectedValue);
      const isOther = selectedValue === 'Other';
      setIsOtherSelected(isOther);

      // Clear submissionItemOther when switching away from "Other" to avoid saving stale data
      if (!isOther) {
        setValue('submissionItemOther', '', { shouldDirty: false });
        clearErrors('submissionItemOther');
      }
    },
    [setValue, clearErrors]
  );

  return (
    <>
      <FormContainer labelWidth='220px'>
        <FormItem fieldName='requestTitle'>
          <FormLabel isRequired>Request Title</FormLabel>
          <SPTextField
            name='requestTitle'
            placeholder='Enter a descriptive title for your request'
            mode={SPTextFieldMode.SingleLine}
            maxLength={TITLE_MAX_LENGTH}
            showCharacterCount
            stylingMode='outlined'
            rules={{
              required: 'Request title is required',
              minLength: { value: 3, message: 'Request title must be at least 3 characters' },
              maxLength: { value: TITLE_MAX_LENGTH, message: FIELD_LIMIT_MESSAGES.title },
            }}
          />
        </FormItem>

        <FormItem fieldName='purpose'>
          <FormLabel isRequired>Purpose</FormLabel>
          <SPTextField
            name='purpose'
            placeholder='Describe the purpose of this request in detail'
            mode={SPTextFieldMode.MultiLine}
            rows={4}
            maxLength={PURPOSE_MAX_LENGTH}
            showCharacterCount
            stylingMode='outlined'
            rules={{
              required: 'Purpose is required',
              minLength: { value: 10, message: 'Purpose must be at least 10 characters' },
              maxLength: { value: PURPOSE_MAX_LENGTH, message: FIELD_LIMIT_MESSAGES.purpose },
            }}
          />
        </FormItem>

        <FormItem fieldName='submissionType'>
          <FormLabel isRequired>Submission Type</FormLabel>
          <SPChoiceField
            name='submissionType'
            placeholder='Select submission type'
            displayType={SPChoiceDisplayType.Dropdown}
            choices={SUBMISSION_TYPE_CHOICES}
            dataSource={{
              type: 'list',
              listNameOrId: requestListIdentifier,
              fieldInternalName: 'SubmissionType',
            }}
            showClearButton
            rules={{
              required: 'Submission type is required',
            }}
          />
        </FormItem>

        <FormItem fieldName='submissionItem'>
          <FormLabel isRequired>Submission Item</FormLabel>
          <Controller
            name='submissionItem'
            control={control}
            rules={{ required: 'Submission Item is required' }}
            render={({ field, fieldState }) => (
              <Stack tokens={{ childrenGap: 4 }}>
                {isLoadingSubmissionItems && (
                  <Spinner size={SpinnerSize.small} label='Loading submission items...' />
                )}
                {submissionItemsError && (
                  <Text variant='small' styles={{ root: { color: '#d13438' } }}>
                    Error loading submission items: {submissionItemsError}
                  </Text>
                )}
                {!isLoadingSubmissionItems && !submissionItemsError && (
                  <SelectBox
                    dataSource={submissionItems}
                    displayExpr='title'
                    valueExpr='title'
                    value={field.value}
                    onValueChanged={e => {
                      handleSubmissionItemChange(e.value, field.onChange);
                    }}
                    placeholder='Select submission item'
                    searchEnabled={true}
                    showClearButton={true}
                    stylingMode='outlined'
                    disabled={submissionItems.length === 0}
                    isValid={!fieldState.error}
                  />
                )}
                {/* Error display removed - FormItem handles it via fieldName='submissionItem' */}
              </Stack>
            )}
          />
        </FormItem>

        <FormItem
          fieldName='submissionItemOther'
          style={{ display: isOtherSelected ? 'block' : 'none' }}
        >
          <FormLabel isRequired>Specify Other Submission Item</FormLabel>
          <SPTextField
            name='submissionItemOther'
            placeholder='Please specify the submission item'
            mode={SPTextFieldMode.SingleLine}
            maxLength={TITLE_MAX_LENGTH}
            showCharacterCount
            stylingMode='outlined'
            rules={{
              required: isOtherSelected
                ? 'Please specify the submission item when selecting Other'
                : false,
            }}
          />
        </FormItem>

        <FormItem fieldName='targetReturnDate'>
          <FormLabel isRequired>Target Return Date</FormLabel>
          <SPDateField
            name='targetReturnDate'
            placeholder='Select target return date'
            dateTimeFormat={SPDateTimeFormat.DateOnly}
            displayFormat='MM/dd/yyyy'
            showClearButton
            calendarButtonPosition='before'
            minDate={new Date()}
            disabled={!hasSubmissionItemSelection}
            rules={{
              required: 'Target return date is required',
            }}
          />
          {!hasSubmissionItemSelection && (
            <Text variant='small' styles={{ root: { color: '#605e5c', marginTop: '4px' } }}>
              Please select a submission item first
            </Text>
          )}
        </FormItem>

        {calculatedIsRush && (
          <FormItem fieldName='rushRationale'>
            <FormLabel isRequired>Rush Rationale</FormLabel>
            <>
              <Text
                variant='small'
                styles={{ root: { color: '#c67700', marginBottom: '8px', display: 'block' } }}
              >
                ⚠️ Rush request: Target date is sooner than standard turnaround time
              </Text>
              <SPTextField
                name='rushRationale'
                placeholder='Please explain why this deadline is necessary.'
                mode={SPTextFieldMode.MultiLine}
                rows={3}
                maxLength={RUSH_RATIONALE_MAX_LENGTH}
                showCharacterCount
                stylingMode='outlined'
                rules={{
                  required: 'Rush rationale is required for rush requests',
                  maxLength: {
                    value: RUSH_RATIONALE_MAX_LENGTH,
                    message: FIELD_LIMIT_MESSAGES.rushRationale,
                  },
                }}
              />
            </>
          </FormItem>
        )}
      </FormContainer>
    </>
  );
};

interface DistributionSectionProps {
  errors: FieldErrors<ILegalRequest>;
  requestType?: RequestType;
}

export const DistributionSection: React.FC<DistributionSectionProps> = ({
  errors,
  requestType,
}) => {
  const requestListIdentifier = Lists.Requests.Title;
  const distributionChoices = React.useMemo(() => DISTRIBUTION_METHOD_CHOICES, []);

  // Determine if section should be visible
  const isVisible = requestType === RequestType.Communication;

  return (
    <>
      <div style={{ display: isVisible ? 'block' : 'none' }}>
        <Separator />
        <SectionHeader
          icon='Send'
          title='Distribution'
          description='Specify how and where this communication will be distributed'
        />
      </div>
      <FormContainer labelWidth='220px' style={{ display: isVisible ? 'block' : 'none' }}>
        <FormItem fieldName='distributionMethod'>
          <FormLabel isRequired={isVisible}>Distribution Method</FormLabel>
          <SPChoiceField
            name='distributionMethod'
            placeholder='Select one or more distribution methods'
            allowMultiple
            displayType={SPChoiceDisplayType.Checkboxes}
            choices={distributionChoices}
            dataSource={{
              type: 'list',
              listNameOrId: requestListIdentifier,
              fieldInternalName: 'DistributionMethod',
            }}
            rules={{
              required: isVisible ? 'At least one distribution method is required' : false,
            }}
          />
        </FormItem>

        <FormItem fieldName='dateOfFirstUse'>
          <FormLabel isRequired={isVisible}>Date of First Use</FormLabel>
          <SPDateField
            name='dateOfFirstUse'
            placeholder='Select date of first use'
            dateTimeFormat={SPDateTimeFormat.DateOnly}
            displayFormat='MM/dd/yyyy'
            showClearButton
            minDate={new Date()}
            calendarButtonPosition='before'
            rules={{
              required: isVisible ? 'Date of first use is required' : false,
            }}
          />
        </FormItem>
      </FormContainer>
    </>
  );
};

interface ReviewAudienceSectionProps {
  errors: FieldErrors<ILegalRequest>;
  requestType?: RequestType;
}

/**
 * ReviewAudienceSection Component
 *
 * Displays a prominent card-based selector for choosing the review audience.
 * Uses the ReviewAudienceSelector component for a more visual and user-friendly
 * selection experience compared to a dropdown.
 *
 * Options:
 * - Legal Only: Request reviewed by Legal team only
 * - Compliance Only: Request reviewed by Compliance team only
 * - Both: Request reviewed by both teams
 */
export const ReviewAudienceSection: React.FC<ReviewAudienceSectionProps> = ({
  errors,
  requestType,
}) => {
  // Determine if section should be visible (only for Communication requests)
  const isVisible = requestType === RequestType.Communication;

  return (
    <>
      {/* Section header - only visible for Communication requests */}
      <div style={{ display: isVisible ? 'block' : 'none' }}>
        <Separator />
        <SectionHeader
          icon='Megaphone'
          title='Review Audience'
          description='Select which teams should review this communication'
        />
      </div>

      {/* Card-based review audience selector */}
      <div style={{ display: isVisible ? 'block' : 'none', marginTop: '16px' }}>
        <FormItem fieldName='reviewAudience'>
          <ReviewAudienceSelector name='reviewAudience' isRequired={isVisible} />
        </FormItem>
      </div>
    </>
  );
};

interface ProductAudienceSectionProps {
  errors: FieldErrors<ILegalRequest>;
  requestType?: RequestType;
}

export const ProductAudienceSection: React.FC<ProductAudienceSectionProps> = ({
  errors,
  requestType,
}) => {
  const requestListIdentifier = Lists.Requests.Title;

  // Only show for Communication requests
  const isVisible = requestType === RequestType.Communication;

  return (
    <>
      <div style={{ display: isVisible ? 'block' : 'none' }}>
        <Separator />
        <SectionHeader
          icon='ProductCatalog'
          title='Product & Audience Details'
          description='Specify the target audience and products for this communication'
        />
      </div>
      <div style={{ display: isVisible ? 'block' : 'none' }}>
        {/* FINRA Audience Category and Audience in one row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            marginBottom: '16px',
          }}
        >
          <FormContainer labelWidth='220px'>
            <FormItem fieldName='finraAudienceCategory'>
              <FormLabel infoText='Select the FINRA audience classification for this communication'>
                FINRA Audience Category
              </FormLabel>
              <SPChoiceField
                name='finraAudienceCategory'
                placeholder='Select FINRA audience categories'
                allowMultiple
                displayType={SPChoiceDisplayType.Checkboxes}
                choices={FINRA_AUDIENCE_CATEGORY_CHOICES}
                dataSource={{
                  type: 'list',
                  listNameOrId: requestListIdentifier,
                  fieldInternalName: 'FINRAAudienceCategory',
                }}
              />
            </FormItem>
          </FormContainer>
          <FormContainer labelWidth='220px'>
            <FormItem fieldName='audience'>
              <FormLabel>Audience</FormLabel>
              <SPChoiceField
                name='audience'
                placeholder='Select target audiences'
                allowMultiple
                displayType={SPChoiceDisplayType.Checkboxes}
                choices={AUDIENCE_CHOICES}
                dataSource={{
                  type: 'list',
                  listNameOrId: requestListIdentifier,
                  fieldInternalName: 'Audience',
                }}
              />
            </FormItem>
          </FormContainer>
        </div>

        {/* U.S. Funds and UCITS in one row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            marginBottom: '16px',
          }}
        >
          <FormContainer labelWidth='220px'>
            <FormItem fieldName='usFunds'>
              <FormLabel infoText='Select the U.S. mutual funds referenced in this communication'>
                U.S. Funds
              </FormLabel>
              <SPChoiceField
                name='usFunds'
                placeholder='Select U.S. funds'
                allowMultiple
                displayType={SPChoiceDisplayType.Checkboxes}
                choices={US_FUNDS_CHOICES}
                dataSource={{
                  type: 'list',
                  listNameOrId: requestListIdentifier,
                  fieldInternalName: 'USFunds',
                }}
              />
            </FormItem>
            <FormItem fieldName='usFundShares'>
              <FormLabel>&nbsp;</FormLabel>
              <FormValue>
                <div style={{ paddingLeft: 30 }}>
                  <SPChoiceField
                    name='usFundShares'
                    allowMultiple
                    displayType={SPChoiceDisplayType.Checkboxes}
                    choices={US_FUND_SHARES_CHOICES}
                    dataSource={{
                      type: 'list',
                      listNameOrId: requestListIdentifier,
                      fieldInternalName: 'USFundShares',
                    }}
                  />
                </div>
              </FormValue>
            </FormItem>
          </FormContainer>
          <FormContainer labelWidth='220px'>
            <FormItem fieldName='ucits'>
              <FormLabel infoText='Select the UCITS funds referenced in this communication'>
                UCITS
              </FormLabel>
              <SPChoiceField
                name='ucits'
                placeholder='Select UCITS funds'
                allowMultiple
                displayType={SPChoiceDisplayType.Checkboxes}
                choices={UCITS_CHOICES}
                dataSource={{
                  type: 'list',
                  listNameOrId: requestListIdentifier,
                  fieldInternalName: 'UCITS',
                }}
              />
            </FormItem>
          </FormContainer>
        </div>

        {/* Separate Account Strategies */}
        <FormContainer labelWidth='220px'>
          <FormItem fieldName='separateAcctStrategies'>
            <FormLabel infoText='Select the separate account strategies referenced in this communication'>
              Separate Account Strategies
            </FormLabel>
            <SPChoiceField
              name='separateAcctStrategies'
              placeholder='Select separate account strategies'
              allowMultiple
              displayType={SPChoiceDisplayType.Checkboxes}
              choices={SEPARATE_ACCT_STRATEGIES_CHOICES}
              dataSource={{
                type: 'list',
                listNameOrId: requestListIdentifier,
                fieldInternalName: 'SeparateAcctStrategies',
              }}
            />
          </FormItem>

          <FormItem fieldName='separateAcctStrategiesIncl'>
            <FormLabel>&nbsp;</FormLabel>
            <FormValue>
              <b>Includes</b>

              <SPChoiceField
                name='separateAcctStrategiesIncl'
                placeholder='Select what separate account strategies include'
                allowMultiple
                displayType={SPChoiceDisplayType.Checkboxes}
                choices={SEPARATE_ACCT_STRATEGIES_INCL_CHOICES}
                dataSource={{
                  type: 'list',
                  listNameOrId: requestListIdentifier,
                  fieldInternalName: 'SeparateAcctStrategiesIncl',
                }}
              />
            </FormValue>
          </FormItem>
        </FormContainer>
      </div>
    </>
  );
};

interface PriorSubmissionsSectionProps {
  errors: FieldErrors<ILegalRequest>;
  priorSubmissions: ILegalRequest['priorSubmissions'] | undefined;
  onPriorSubmissionsChange: (value: ILegalRequest['priorSubmissions']) => void;
  isLoading: boolean;
  currentUserDepartment?: string;
}

export const PriorSubmissionsSection: React.FC<PriorSubmissionsSectionProps> = ({
  errors,
  priorSubmissions,
  onPriorSubmissionsChange,
  isLoading,
  currentUserDepartment,
}) => {
  return (
    <>
      <Separator />
      <SectionHeader
        icon='History'
        title='Prior and/or Related Submissions Information (If Applicable)'
        description='Reference any related prior or related submissions'
      />
      <FormContainer labelWidth='220px'>
        <FormItem fieldName='contentId'>
          <FormLabel>Business Tracking/Content Id</FormLabel>
          <SPTextField
            name='contentId'
            placeholder='Enter business tracking or content ID'
            mode={SPTextFieldMode.SingleLine}
            maxLength={255}
            stylingMode='outlined'
          />
        </FormItem>

        <FormItem fieldName='priorSubmissions'>
          <FormLabel infoText='Search by request ID, client ID, title, or submission item to find related workflows'>
            Workflow Ids
          </FormLabel>
          <PriorSubmissionPicker
            value={priorSubmissions || []}
            onChange={onPriorSubmissionsChange}
            disabled={isLoading}
            currentUserDepartment={currentUserDepartment}
            placeholder='Search by request ID, client ID, title, or submission item...'
          />
        </FormItem>

        <FormItem fieldName='priorSubmissionNotes'>
          <FormLabel>Notes</FormLabel>
          <SPTextField
            name='priorSubmissionNotes'
            placeholder='Add any notes about prior or related submissions'
            mode={SPTextFieldMode.MultiLine}
            rows={3}
            maxLength={PURPOSE_MAX_LENGTH}
            showCharacterCount
            stylingMode='outlined'
          />
        </FormItem>
      </FormContainer>
    </>
  );
};

interface AdditionalPartiesSectionProps {
  errors: FieldErrors<ILegalRequest>;
}

export const AdditionalPartiesSection: React.FC<AdditionalPartiesSectionProps> = ({ errors }) => {
  const { control } = useFormContext<ILegalRequest>();

  return (
    <>
      <Separator />
      <SectionHeader
        icon='People'
        title='Additional Parties'
        description='Add other people who should be notified or involved'
      />
      <FormContainer labelWidth='220px'>
        <FormItem fieldName='additionalParty'>
          <FormLabel>Additional Parties</FormLabel>
          <SPUserField
            name='additionalParty'
            control={control}
            placeholder='Search for people to add'
            allowMultiple={true}
            maxSelections={10}
            showPhoto
            showEmail
          />
        </FormItem>
      </FormContainer>
    </>
  );
};
