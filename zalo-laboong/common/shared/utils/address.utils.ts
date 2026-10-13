    import {IAddress, IAddressForm} from '@shared/models/global';
    import {IAddressItem, ICreateAddressParams, IUpdateAddressParams} from '@shared/models/api';

    export function mapApiToAddress(item: IAddressItem): IAddress {
    return {
        id: String(item.id),
        name: item.recipientName,
        mobile: item.recipientPhone,
        address: item.address ?? '',
        isDefault: item.isDefault === 1,
        location: {
        cityId: item.shipToCityLocationId ?? null,
        districtId: item.shipToDistrictLocationId ?? null,
        wardId: item.shipToWardLocationId ?? null,
        cityName: item.provinceName ?? '',
        districtName: item.districtName ?? '',
        wardName: item.wardName ?? '',
        },
    } as IAddress;
    }

    export function mapFormToCreateParams(form: IAddressForm): ICreateAddressParams {
    const v = form.getRawValue();
    return {
        recipientName: v.name,
        recipientPhone: v.mobile,
        address: v.address,
        isDefault: v.isDefault ? 1 : 0,
        type: v.type ?? undefined,
        shipToCityLocationId: v.location.cityId ?? undefined,
        shipToDistrictLocationId: v.location.districtId ?? undefined,
        shipToWardLocationId: v.location.wardId ?? undefined,
        provinceName: v.location.cityName,
        districtName: v.location.districtName,
        wardName: v.location.wardName,
    };
    }

    export function mapFormToUpdateParams(id: string | number, form: IAddressForm): IUpdateAddressParams {
    return {
        ...mapFormToCreateParams(form),
        id: Number(id),
    };
    }